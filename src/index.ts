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
		// header to `https://example.com`.
		const corsHeaders = {
			"Access-Control-Allow-Origin": `${env.CORS_ALLOW_ORIGIN || '*'}`,
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader || upgradeHeader === 'websocket') {
      return await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, request)
    }

		const {pathname, search} = new URL(request.url)
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
