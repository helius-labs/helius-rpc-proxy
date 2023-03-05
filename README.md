# Helius RPC Proxy

> NOTE: You must have an existing Helius account and API key for this to work! Get one for free at https://helius.xyz.

This repo hosts a one-click-deploy Cloudflare worker that proxies RPC requests to Helius. 


## Step 1

Press the button below to deploy this to your own Cloudflare account:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helius-labs/helius-rpc-proxy)

## Step 2

Navigate to your newly deployed worker, and click "Settings" and then "Variables":
![Variables](docs/add_variable.png)

## Step 3
Add a new variable with the key name `HELIUS_API_KEY` and your Helius API key as the value:
![Add Secret](docs/add_secret.png)

***NOTE:*** We recommend selecting "Encrypt". This will hide your key from the UI and API responses, and redact them from logs.
![Encrypt](docs/encrypt.png)

## Step 4
Refresh the page and confirm that your key is now saved and encrypted:
![Confirm](docs/confirm.png)

You can now use your worker URL as an the RPC endpoint in all SDK and client side configurations without your API key leaking!