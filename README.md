<p align="center">
  <br/>
  <a target="_blank" href="https://coliving.co">
    <img src="https://avatars1.githubusercontent.com/u/38231615?s=400&u=c00678880596dabd2746dae13a47edbe7ea7210e&v=4" width="150px" >
  </a>
  <br/>

  <p align="center">
    <b>Coliving Protocol</b>
  </p>
</p>

<br/>
<br/>

[![CircleCI](https://circleci.com/gh/AudiusProject/coliving-protocol/tree/master.svg?style=svg&circle-token=e272a756b49e50a54dcc096af8fd8b0405f6bf41)](https://circleci.com/gh/AudiusProject/coliving-protocol/tree/master)

Coliving is a decentralized, community-owned music-sharing protocol

This repository encompasses all of the services, contracts, and client-side libraries that
comprise the Coliving protocol.

For further details on operating an Coliving service, getting started with the Token and the API, see [docs.coliving.org](https://docs.coliving.org/).

## Overview

### Coliving Services

These off-chain services are run by community members via the Coliving staking system:

| Service                                                        | Description                                                                                       
| -- | --
| [`creator-node`](creator-node)                  | Maintains the availability of users' content via the Coliving Storage Protocol, including user metadata, images, and audio content. Also known as Content Node.
| [`discovery-provider`](discovery-provider)      | Indexes and stores the contents of the coliving contracts on the Ethereum & Solana blockchains for clients to query via an API. Also known as Discovery Node.
| [`identity-service`](identity-service)          | Stores encrypted auth ciphertexts and handles oauth artifacts

### Smart Contracts & Programs

The independent sets of smart contracts that power the on-chain aspects of the Coliving protocol:

| Contracts                                                        | Description                                                                                       
| -- | --
| [`eth-contracts`](https://github.com/AudiusProject/coliving-protocol/tree/master/eth-contracts) | The Ethereum smart contracts that run the Coliving protocol, encompassing the Coliving ERC20 token and functionality for staking, off-chain service registration / lookup, and governance
| [`solana-programs`](https://github.com/AudiusProject/coliving-protocol/tree/master/solana-programs) | The Solana programs for the Coliving protocol, encompassing user account, content listing, and content interaction functionality
| [`contracts`](https://github.com/AudiusProject/coliving-protocol/tree/master/contracts)         | The POA network smart contracts for the Coliving protocol, encompassing user account, content listing, and content interaction functionality

### Coliving Client Libraries

Client-side libraries to provide a unified interface for interacting with the entire
Coliving protocol:

| Library                                                        | Description                                                                                       
| -- | --
| [`libs`](https://github.com/AudiusProject/coliving-protocol/tree/master/libs)     | A complete javascript interface to the Coliving smart contracts and Coliving services: Identity Service, Discovery Provider, Creator Node

### Coliving Tools & Tests

Packages for developers to run and test Coliving

| Library                                                        | Description                                                                                       
| -- | --
| [`service-commands`](https://github.com/AudiusProject/coliving-protocol/tree/master/service-commands)     | Tooling to run an entire instance of Coliving locally with all dependencies
| [`mad-dog`](https://github.com/AudiusProject/coliving-protocol/tree/master/mad-dog)     | A system level test suite and tests for Coliving


## Development

### Prerequisites

* Install docker & docker-compose [https://docs.docker.com/get-docker](https://docs.docker.com/get-docker)
* Install rust https://rustup.rs/
* Install nvm & node (v14.17.5) https://github.com/nvm-sh/nvm

### Running the protocol
```bash
git clone https://github.com/AudiusProject/coliving-protocol.git
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
A run discovery-provider up
A run discovery-provider down
```

For more details on the `A` command and options, run `A --help` and checkout the service commands [README](https://github.com/AudiusProject/coliving-protocol/tree/master/service-commands).


## Contributing

We welcome contributions to Coliving from anyone who opens a PR. Feel free to reach out to
our team [on Discord](https://discord.com/invite/yNUg2e2) or via other channels for feedback and/or support!

## Security

Please report security issues to `security@coliving.co` with a description of the
vulnerability and any steps to reproduce. Details on our bug bounty program are available at [coliving.org/security](https://coliving.org/security)

## License

Apache 2.0: [LICENSE file](https://github.com/AudiusProject/coliving-protocol/blob/master/LICENSE)
