interface Env {
	CORS_ALLOW_ORIGIN: string;
	HELIUS_API_KEY: string;
	SESSION_KEY: string;
}

async function gatherResponse(response: Response) {
	const { headers } = response;
	const contentType = headers.get("content-type") || "";
	console.log(response.text());
	console.log(await response.json())
	if (contentType.includes("application/json")) {
		return JSON.stringify(await response.json());
	} else if (contentType.includes("application/text")) {
		return response.text();
	} else if (contentType.includes("text/html")) {
		return response.text();
	} else {
		return response.text();
	}
}

export default {
	async fetch(request: Request, env: Env) {
		console.log(request);	
	
		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`.
		const corsHeaders = {
			"Access-Control-Allow-Origin": `${env.CORS_ALLOW_ORIGIN || "*"}`,
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}

		let rpcNetwork;
		let apiNetwork;
		const headers = request.headers;
    const host = headers.get("Host");
		if (host == "solana-rpc.web.helium.io") {
			rpcNetwork = "rpc-devnet";
			apiNetwork = "api-devnet";
		}
		if (host == 'solana-rpc.web.test-helium.com') {
			rpcNetwork = "rpc-devnet";
			apiNetwork = "api-devnet";
		}

		const { searchParams, pathname, search } = new URL(request.url);
		console.log(searchParams);
		console.log(pathname);
		console.log(search);
		const sessionKey = searchParams.get("session-key");
		if (sessionKey != env.SESSION_KEY) {
			return new Response(null, {
				status: 404,
				statusText: "Unexpected path"
			});
		}
		searchParams.delete("session-key");
		console.log(searchParams);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader || upgradeHeader === "websocket") {
      return await fetch(`https://${rpcNetwork}.helius.xyz/?api-key=${env.HELIUS_API_KEY}`, request);
    }

		const payload = await request.text();
		console.log(payload);
		let formattedPayload;
		try {
			const parsedJson = JSON.parse(payload);
			formattedPayload = JSON.stringify(parsedJson);
			console.log(formattedPayload);
		} catch (error) {
			// just means that the payload wasn't stringified json
		}
		console.log(`https://${pathname === "/" ? rpcNetwork : apiNetwork}.helius.xyz${pathname}?api-key=${env.HELIUS_API_KEY}`);
		const proxyRequest = new Request(`https://${pathname === "/" ? rpcNetwork : apiNetwork}.helius.xyz${pathname}?api-key=${env.HELIUS_API_KEY}`, {
			method: request.method,
			body: formattedPayload || null,
			redirect: "follow",
			cf: { apps: false },
			headers: {
				"Content-Type": "application/json",
				"X-Helius-Cloudflare-Proxy": "true",
				...corsHeaders,
			}
		});

		const response = await fetch(proxyRequest);
    const results = await gatherResponse(response);

    return new Response(results);
	},
};
