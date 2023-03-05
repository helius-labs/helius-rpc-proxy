interface Env {
	HELIUS_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {
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
