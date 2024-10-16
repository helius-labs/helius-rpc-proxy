# Helius RPC Proxy

This repo hosts a Cloudflare worker that proxies RPC requests to Helius. The proxy will allow you to keep your API key
hidden from public requests made by clients. You will need both a [Helius](https://helius.xyz) account and a [Cloudflare](https://cloudflare.com) account to deploy this.

Both standard JSON RPC and Websockets are supported!

[Video Walkthrough](https://www.loom.com/share/a7add579f1c349d2a4bcab96ee04c47e)

# JWT Validation

`JWT_SECRET` variable is needed for jwt validation of incoming requests.

# Additional Security Steps

This implementation is intentionally left in a less-than-ideal security state to facilitate easy deployment by anyone. If you would like to
lock down your RPC proxy further, consider the following steps after you have successfully deployed the worker:

- Update the `Access-Control-Allow-Origin` header by adding a new variable with the key name `CORS_ALLOW_ORIGIN` to contain the host that your requests are coming from (usually your client application). For example, if you wanted to allow requests from `https://example.com`, you would change the header to `https://example.com`. To support multiple domains, set `CORS_ALLOW_ORIGIN` to a comma separated list of domains (e.g. `https://example.com,https://beta.example.com`).
- [Cloudflare Web Application Firewall (WAF)](https://www.cloudflare.com/lp/ppc/waf-x/) - You can configure the WAF to inspect requests and allow/deny based on your own business logic.
- Modify the IP address allow list in Helius for your API key to only accept connections from the Cloudflare ranges (https://cloudflare.com/ips-v4).
