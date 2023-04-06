# Helius RPC Proxy

[![RPC Proxy](docs/rpc_proxy.png)](https://helius.xyz)

This repo hosts a one-click-deploy Cloudflare worker that proxies RPC requests to Helius. The proxy will allow you to keep your API key
hidden from public requests made by clients. You will need both a [Helius](https://helius.xyz) account and a [Cloudflare](https://cloudflare.com) account to deploy this. Helius offers 100k credits for free each month, and Cloudflare workers can execute 100k invocations each day for free. Most projects can easily get started within these free tiers.

Both standard JSON RPC and Websockets are supported!

[Video Walkthrough](https://www.loom.com/share/a7add579f1c349d2a4bcab96ee04c47e)

# Setup
### Step 1

Press the button below to deploy this to your own Cloudflare account:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helius-labs/helius-rpc-proxy)

### Step 2

Navigate to your newly deployed worker, and click "Settings" and then "Variables":

![Variables](docs/add_variable.png)

### Step 3
Add a new variable with the key name `HELIUS_API_KEY` and your Helius API key as the value:

![Add Secret](docs/add_secret.png)

> NOTE: We recommend selecting "Encrypt". This will hide your key from the UI and API responses, and redact them from logs.

![Encrypt](docs/encrypt.png)

### Step 4
Refresh the page and confirm that your key is now saved and encrypted:

![Confirm](docs/confirm.png)

You can now use your worker URL as an the RPC endpoint in all SDK and client side configurations without your API key leaking!
# Additional Security Steps
This implementation is intentionally left in a less-than-ideal security state to facilitate easy deployment by anyone. If you would like to
lock down your RPC proxy further, consider the following steps after you have successfully deployed the worker:


* Update the `Access-Control-Allow-Origin` header by adding a new variable with the key name `CORS_ALLOW_ORIGIN` to contain the host that your requests are coming from (usually your client application). For example, if you wanted to allow requests from `https://example.com`, you would change the header to `https://example.com`. To support multiple domains, set `CORS_ALLOW_ORIGIN` to a comma separated list of domains (e.g. `https://example.com,https://beta.example.com`).
* [Cloudflare Web Application Firewall (WAF)](https://www.cloudflare.com/lp/ppc/waf-x/) - You can configure the WAF to inspect requests and allow/deny based on your own business logic.
* Modify the IP address allow list in Helius for your API key to only accept connections from the Cloudflare ranges (https://cloudflare.com/ips-v4).
