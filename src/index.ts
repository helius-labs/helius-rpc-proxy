interface Env {
	CORS_ALLOW_ORIGIN: string;
	HELIUS_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {

		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`. Multiple domains are supported by verifying that the request
		// originated from one of the domains in the `CORS_ALLOW_ORIGIN` environment variable.
		const supportedDomains = env.CORS_ALLOW_ORIGIN ? env.CORS_ALLOW_ORIGIN.split(',') : undefined;
		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}
		if (supportedDomains) {
			const origin = request.headers.get('Origin')
			if (origin && supportedDomains.includes(origin)) {
				corsHeaders['Access-Control-Allow-Origin'] = origin
			}
		} else {
			corsHeaders['Access-Control-Allow-Origin'] = '*'
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

	const upgrade = request.headers.get('Upgrade')?.toLowerCase();
	if (upgrade === 'websocket') {
		const { search } = new URL(request.url);
		const upstreamUrl = `wss://mainnet.helius-rpc.com${search ? `${search}&` : '?'}api-key=${env.HELIUS_API_KEY}`;
		
		// Create WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);
		
		// Accept the client connection
		server.accept();
		
		// Connect to upstream WebSocket
		const upstream = new WebSocket(upstreamUrl);
		
		// Forward messages from client to upstream
		server.addEventListener('message', event => {
			if (upstream.readyState === WebSocket.OPEN) {
				upstream.send(event.data);
			}
		});
		
		// Forward messages from upstream to client
		upstream.addEventListener('message', event => {
			if (server.readyState === WebSocket.OPEN) {
				server.send(event.data);
			}
		});
		
		// Handle connection close
		server.addEventListener('close', () => {
			upstream.close();
		});
		
		upstream.addEventListener('close', () => {
			server.close();
		});
		
		// Handle errors
		server.addEventListener('error', () => {
			upstream.close();
		});
		
		upstream.addEventListener('error', () => {
			server.close();
		});
		
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}


		const { pathname, search } = new URL(request.url)
		const payload = await request.text();
		const proxyRequest = new Request(`https://${pathname === '/' ? 'mainnet.helius-rpc.com' : 'api.helius.xyz'}${pathname}?api-key=${env.HELIUS_API_KEY}${search ? `&${search.slice(1)}` : ''}`, {
			method: request.method,
			body: payload || null,
			headers: {
				'Content-Type': 'application/json',
				'X-Helius-Cloudflare-Proxy': 'true',
			}
		});

		return await fetch(proxyRequest).then(res => {
			return new Response(res.body, {
				status: res.status,
				headers: corsHeaders
			});
		});
	},
};
