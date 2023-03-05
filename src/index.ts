interface Env {
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
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}
		

		const payload = await request.json();
		const proxyRequest = new Request(`https://rpc.helius.xyz/?api-key=${env.HELIUS_API_KEY}`, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json',
				'X-Helius-Cloudflare-Proxy': 'true',
			}
		});

		return await fetch(proxyRequest);
	},
};
