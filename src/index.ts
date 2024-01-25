interface Env {
  CORS_ALLOW_ORIGIN: string;
  HELIUS_API_KEY: string;
  IS_DEVNET: string;
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
    const supportedDomains = env.CORS_ALLOW_ORIGIN
      ? env.CORS_ALLOW_ORIGIN.split(",")
      : undefined;
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (supportedDomains) {
      const origin = request.headers.get("Origin");
      if (origin && supportedDomains.includes(origin)) {
        corsHeaders["Access-Control-Allow-Origin"] = origin;
      }
    } else {
      corsHeaders["Access-Control-Allow-Origin"] = "*";
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }
    const upgradeHeader = request.headers.get("Upgrade");
    const endpoint_prefix =
      env.IS_DEVNET === "1"
        ? "devnet.helius-rpc.com"
        : "mainnet.helius-rpc.com";

    console.log(endpoint_prefix);
    if (upgradeHeader || upgradeHeader === "websocket") {
      return await fetch(
        `${endpoint_prefix}?api-key=${env.HELIUS_API_KEY}`,
        request
      );
    }

    const { pathname, searchParams } = new URL(request.url);
    const apiUrl = pathname === "/" ? endpoint_prefix : "api.helius.xyz";
    const search =
      Array.from(searchParams).length > 0 ? `?${searchParams}` : "";
    const proxyRequest = new Request(
      `https://${apiUrl}${pathname}?api-key=${env.HELIUS_API_KEY}${search}`,
      {
        method: request.method,
        body: request.method !== "GET" ? await request.text() : undefined,
        headers: {
          "Content-Type": "application/json",
          "X-Helius-Cloudflare-Proxy": "true",
        },
      }
    );

    return await fetch(proxyRequest).then((res) => {
      return new Response(res.body, {
        status: res.status,
        headers: corsHeaders,
      });
    });
  },
};
