interface Env {
	HELIUS_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {
		const proxyRequest = new Request(`https://rpc.helius.xyz/?api-key=${env.HELIUS_API_KEY}`, {
			method: request.method,
			headers: request.headers,
			body: request.body,
		});

		return fetch(proxyRequest);
	},
};
