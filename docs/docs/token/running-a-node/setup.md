---
sidebar_label: Setup Instructions
sidebar_position: 3
---

# Setup Instructions

This guide describes how to run Coliving services on a single machine via Docker Compose.
The repository of Docker Compose files can be found on [GitHub](https://github.com/dgc-network/coliving-docker-compose).

Please join the node operator discord channel on the [Coliving discord server](https://discord.com/invite/coliving) for announcements & troubleshooting assistance.


## Installation

On a VM that meets the minimum requirements from above run:

```bash
bash <(curl https://raw.githubusercontent.com/dgc-network/coliving-docker-compose/main/install.sh)
```

During installation there will be prompts for required environment variables. The variables are:

### Creator Node
- `contentNodeEndpoint` - The DNS of your content node. If you haven't registered the service yet, please enter the url you plan to register.
- `delegateOwnerWallet` - Address of wallet that contains no tokens but that is registered on chain, used to sign JSON responses from server
- `delegatePrivateKey` - Private key associated with `delegateOwnerWallet`
- `spOwnerWallet` - Wallet that registered (or will register) the content node on chain

If you're using an externally managed Postgres DB please see [this section](advanced_setup.md#external-content-node-postgres)

### Discovery Node
- `coliving_delegate_owner_wallet` - Address of wallet that contains no tokens but that is registered on chain, used to sign JSON responses from server
- `coliving_delegate_private_key` - Private key associated with `coliving_delegate_owner_wallet`

If you're using an externally managed Postgres DB please see [this section](advanced_setup.md#external-discovery-node-postgres-instance)

## More options
For more advanced configuration options or migrating from Kubernetes check out the [Advanced Setup Guide](advanced_setup.md)
