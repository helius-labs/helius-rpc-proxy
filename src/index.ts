import { Env } from './types';
import { errorHandler } from './utils/errorHandler';

export default {
	async fetch(request: Request, env: Env) {
		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`.
		const corsHeaders = {
			'Access-Control-Allow-Origin': `${env.CORS_ALLOW_ORIGIN || '*'}`,
			'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
			'Access-Control-Allow-Headers': '*',
		};

		// Helius Solana mainnet subdomains (e.g., rpc.helius.xyz, api.helius.xyz) are the default for all
		// incoming requests to the CF worker, but if the request originates from solana-rpc.web.test-helium.com,
		// use the Helius Solana devnet subdomains (e.g., rpc-devnet.helius.xyz, api-devnet.helius.xyz)
		let rpcNetwork = 'rpc';
		let apiNetwork = 'api';
		const headers = request.headers;
		const host = headers.get('Host');
		if (host == 'solana-rpc.web.test-helium.com') {
			rpcNetwork = 'rpc-devnet';
			apiNetwork = 'api-devnet';
		}

		// If the query string session-key value doesn't match the SESSION_KEY env variable, return 404
		// otherwise continue on, but delete the session-key query string param from the list of all
		// other query string params
		const { searchParams, pathname } = new URL(request.url);
		const sessionKey = searchParams.get('session-key');
		if (sessionKey != env.SESSION_KEY) {
			return new Response(null, {
				status: 404,
				statusText: 'Unexpected path',
			});
		}
		searchParams.delete('session-key');

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader || upgradeHeader === 'websocket') {
			const res = await fetch(
				`https://${rpcNetwork}.helius.xyz/?api-key=${env.HELIUS_API_KEY}`,
				request
			);

			if (res.status >= 400) {
				await errorHandler({ env, res: res.clone(), req: request });
			}

			return res;
		}

		const payload = await request.text();

		try {
			const data = JSON.parse(payload);

			if (data.length === 0) {
				return new Response(null, {
					status: 400,
					statusText: JSON.stringify({ jsonrpc: 2.0, id: null, error: { code: -32600, message: "empty rpc batch"}}),
				});
			}
		} catch(e) {
			return new Response(null, {
				status: 400,
				statusText: JSON.stringify({ jsonrpc: 2.0, id: null, error: { code: -32700, message: "failed to parse RPC request body"}}),
			});
		}

		const proxyRequest = new Request(
			`https://${pathname === '/' ? rpcNetwork : apiNetwork}.helius.xyz${pathname}?api-key=${
				env.HELIUS_API_KEY
			}${searchParams.toString() ? `&${searchParams.toString()}` : ''}`,
			{
				method: request.method,
				body: payload || null,
				headers: {
					'Content-Type': 'application/json',
					'X-Helius-Cloudflare-Proxy': 'true',
					...corsHeaders,
				},
			}
		);

		const res = await fetch(proxyRequest);

		if (res.status >= 400) {
			await errorHandler({ env, res: res.clone(), req: request });
		}

		return res;
	},
};
