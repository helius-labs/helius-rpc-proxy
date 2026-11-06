interface Env {
	HELIUS_API_KEY: string;
	CORS_ALLOW_ORIGIN?: string;
}

// Configuration - adjust as needed
const BUFFER_TIMEOUT_MS = 10000;
const KEEPALIVE_INTERVAL_MS = 20000;
// Per-connection memory ceiling for messages queued during the upstream
// handshake. NOT a count cap (that would disconnect clients firing many
// subscribes at connect). 1 MB holds thousands of subscribes; kept modest
// because one isolate can host many connections sharing its heap.
const MAX_PRECONNECT_BUFFER_BYTES = 1024 * 1024;

const KEEPALIVE_MESSAGE = JSON.stringify({
	jsonrpc: "2.0",
	method: "helius_keepalive"
});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Validate required environment
		if (!env.HELIUS_API_KEY) {
			return new Response('Missing HELIUS_API_KEY', { status: 500 });
		}

		// CORS setup
		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`. Multiple domains are supported by verifying that the request
		// originated from one of the domains in the `CORS_ALLOW_ORIGIN` environment variable.
		const supportedDomains = env.CORS_ALLOW_ORIGIN?.split(',').map(d => d.trim());
		const corsHeaders: Record<string, string> = {
			'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		if (supportedDomains) {
			const origin = request.headers.get('Origin');
			if (origin && supportedDomains.includes(origin)) {
				corsHeaders['Access-Control-Allow-Origin'] = origin;
			}
		} else {
			corsHeaders['Access-Control-Allow-Origin'] = '*';
		}

		// Handle preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 200, headers: corsHeaders });
		}

		// WebSocket handling
		const upgrade = request.headers.get('Upgrade')?.toLowerCase();
		if (upgrade === 'websocket') {
			return handleWebSocket(request, env, corsHeaders);
		}

		// HTTP RPC proxy
		return handleRPC(request, env, corsHeaders);
	},
};

async function handleWebSocket(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const { search } = new URL(request.url);
	const upstreamUrl = `wss://mainnet.helius-rpc.com${search ? `${search}&` : '?'}api-key=${env.HELIUS_API_KEY}`;

	// Extract subprotocol
	const clientProtocols = request.headers.get('Sec-WebSocket-Protocol');
	const selectedProtocol = clientProtocols?.split(',')[0]?.trim();

	// Create WebSocket pair
	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);
	server.accept();

	// Connect upstream
	const upstream = selectedProtocol
		? new WebSocket(upstreamUrl, [selectedProtocol])
		: new WebSocket(upstreamUrl);

	// Queued until upstream opens, then flushed. Bounded by bytes, not count.
	let bufferedData: (string | ArrayBuffer)[] = [];
	let bufferedBytes = 0;
	const sizeOf = (data: string | ArrayBuffer): number =>
		typeof data === 'string' ? data.length : data.byteLength;
	let bufferTimeout: ReturnType<typeof setTimeout> | null = null;
	let isUpstreamConnected = false;

	// Keepalive management
	let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

	const startKeepalive = () => {
		keepaliveTimer = setInterval(() => {
			if (upstream.readyState === WebSocket.OPEN) {
				try {
					upstream.send(KEEPALIVE_MESSAGE);
				} catch {
					clearKeepalive();
				}
			} else {
				clearKeepalive();
			}
		}, KEEPALIVE_INTERVAL_MS);
	};

	const clearKeepalive = () => {
		if (keepaliveTimer) {
			clearInterval(keepaliveTimer);
			keepaliveTimer = null;
		}
	};

	const clearBufferTimeout = () => {
		if (bufferTimeout) {
			clearTimeout(bufferTimeout);
			bufferTimeout = null;
		}
	};

	const startBufferTimeout = () => {
		clearBufferTimeout();
		bufferTimeout = setTimeout(() => {
			if (bufferedData.length > 0 && !isUpstreamConnected) {
				bufferedData = [];
				bufferedBytes = 0;
				try {
					server.close(1011, "upstream_connection_timeout");
				} catch { }
			}
		}, BUFFER_TIMEOUT_MS);
	};

	const cleanup = () => {
		clearKeepalive();
		clearBufferTimeout();
		bufferedData = [];
		bufferedBytes = 0;
	};

	// Upstream connection open
	upstream.addEventListener('open', () => {
		isUpstreamConnected = true;
		clearBufferTimeout();

		// Send buffered messages
		if (bufferedData.length > 0) {
			try {
				for (const data of bufferedData) {
					upstream.send(data);
				}
				bufferedData = [];
				bufferedBytes = 0;
			} catch {
				cleanup();
				try { server.close(1011, "upstream_ws_error"); } catch { }
				return;
			}
		}
		startKeepalive();
	});

	// Client to upstream forwarding
	server.addEventListener('message', event => {
		if (isUpstreamConnected && upstream.readyState === WebSocket.OPEN) {
			try {
				upstream.send(event.data);
			} catch {
				cleanup();
				try { server.close(1011, "upstream_ws_error"); } catch { }
			}
		} else {
			if (bufferedData.length === 0) {
				startBufferTimeout();
			}
			const incoming = sizeOf(event.data);

			// Bound memory without disconnecting a healthy client; only a
			// pathological flood (never a real subscribe burst) trips this.
			if (bufferedBytes + incoming > MAX_PRECONNECT_BUFFER_BYTES) {
				cleanup();
				try { server.close(1011, "preconnect_buffer_bytes_exceeded"); } catch { }
				return;
			}

			bufferedData.push(event.data);
			bufferedBytes += incoming;
		}
	});

	// Upstream to client forwarding
	upstream.addEventListener('message', event => {
		if (server.readyState === WebSocket.OPEN) {
			try {
				server.send(event.data);
			} catch {
				cleanup();
				try { upstream.close(1011, "client_ws_error"); } catch { }
			}
		}
	});

	// Connection close handling
	server.addEventListener('close', () => {
		cleanup();
		try { upstream.close(); } catch { }
	});

	upstream.addEventListener('close', () => {
		isUpstreamConnected = false;
		cleanup();
		try { server.close(); } catch { }
	});

	// Error handling
	server.addEventListener('error', () => {
		cleanup();
		try { upstream.close(1011, "client_ws_error"); } catch { }
	});

	upstream.addEventListener('error', () => {
		isUpstreamConnected = false;
		cleanup();
		try { server.close(1011, "upstream_ws_error"); } catch { }
	});

	// Response
	const responseHeaders: Record<string, string> = { ...corsHeaders };
	if (selectedProtocol) {
		responseHeaders['Sec-WebSocket-Protocol'] = selectedProtocol;
	}

	return new Response(null, {
		status: 101,
		webSocket: client,
		headers: responseHeaders,
	});
}

async function handleRPC(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const { pathname, search } = new URL(request.url);

		// Determine target endpoint
		const targetHost = pathname === '/' ? 'mainnet.helius-rpc.com' : 'api.helius.xyz';
		const targetUrl = `https://${targetHost}${pathname}?api-key=${env.HELIUS_API_KEY}${search ? `&${search.slice(1)}` : ''}`;

		const proxyRequest = new Request(targetUrl, {
			method: request.method,
			// Forward the stream directly so large uploads are not buffered in memory.
			body: request.body,
			headers: {
				'Content-Type': 'application/json',
				'X-Helius-Cloudflare-Proxy': 'true',
			}
		});

		const response = await fetch(proxyRequest);

		return new Response(response.body, {
			status: response.status,
			headers: corsHeaders
		});

	} catch {
		return new Response('Proxy Error', {
			status: 502,
			headers: corsHeaders
		});
	}
}
