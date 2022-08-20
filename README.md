# Coliving Protocol

Coliving is a decentralized, community-owned music-sharing protocol

This repository encompasses all of the services, contracts, and client-side libraries that
comprise the Coliving protocol.

For further details on operating an Coliving service, getting started with the Token and the API, see [docs.coliving.lol](https://docs.coliving.lol/).

## Overview

### Coliving Services

These off-chain services are run by community members via the Coliving staking system:

| Service                                                        | Description                                                                                       
| -- | --
| [`content-node`](content-node)                  | Maintains the availability of users' content via the Coliving Storage Protocol, including user metadata, images, and other contents.
| [`discovery-node`](discovery-node)      | Indexes and stores the contents of the coliving contracts on the Ethereum & Solana blockchains for clients to query via an API.
| [`identity-service`](identity-service)          | Stores encrypted auth ciphertexts and handles oauth artifacts

### Smart Contracts & Programs

The independent sets of smart contracts that power the on-chain aspects of the Coliving protocol:

| Contracts                                                        | Description                                                                                       
| -- | --
| [`eth-contracts`](eth-contracts) | The Ethereum smart contracts that run the Coliving protocol, encompassing the Coliving ERC20 token and functionality for staking, off-chain service registration / lookup, and governance
| [`solana-programs`](solana-programs) | The Solana programs for the Coliving protocol, encompassing user account, contentListing, and content interaction functionality
| [`contracts`](contracts)         | The POA network smart contracts for the Coliving protocol, encompassing user account, contentListing, and content interaction functionality

### Coliving Client Libraries

Client-side libraries to provide a unified interface for interacting with the entire
Coliving protocol:

| Library                                                        | Description                                                                                       
| -- | --
| [`libs`](libs)     | A complete javascript interface to the Coliving smart contracts and Coliving services: Identity Service, Discovery Node, Creator Node

### Coliving Tools & Tests

Packages for developers to run and test Coliving

| Library                                                        | Description                                                                                       
| -- | --
| [`service-commands`](service-commands)     | Tooling to run an entire instance of Coliving locally with all dependencies
| [`mad-dog`](mad-dog)     | A system level test suite and tests for Coliving


## Development

### Prerequisites

* Install docker & docker-compose [https://docs.docker.com/get-docker](https://docs.docker.com/get-docker)
* Install rust https://rustup.rs/
* Install nvm & node (v14.17.5) https://github.com/nvm-sh/nvm

### Running the protocol
```bash
git clone https://github.com/dgc-network/coliving-protocol.git
cd coliving-protocol
# Add a line to your rc file of choice
# export PROTOCOL_DIR=$(pwd)

cd $PROTOCOL_DIR/service-commands
npm i
# This will install `A` to your command-line, an interface to the coliving service-commands.
# Ensure ~/.local/bin is in your PATH

# Install all dependencies
A init

# Run the entire stack
A up

# Run an individual service
A run discovery-node up
A run discovery-node down
```

For more details on the `A` command and options, run `A --help` and checkout the service commands [README](service-commands).


## Contributing

We welcome contributions to Coliving from anyone who opens a PR. Feel free to reach out to
our team [on Discord](https://discord.com/invite/yNUg2e2) or via other channels for feedback and/or support!

## Security

Please report security issues to `security@coliving.lol` with a description of the
vulnerability and any steps to reproduce. Details on our bug bounty program are available at [coliving.lol/security](https://coliving.lol/security)

## License

Apache 2.0: [LICENSE file](LICENSE)
