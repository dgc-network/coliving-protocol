---
sidebar_label: Overview
sidebar_position: 1
---

# Overview

Coliving is a decentralized, community-owned and artist-controlled music-sharing protocol. Coliving provides a blockchain-based alternative to existing streaming platforms to help artists publish and monetize their work and distribute it directly to fans.

The mission of the project is to give everyone the freedom to share, monetize, and listen to any audio.

The Coliving Protocol [repository](https://github.com/dgc.network/-protocol) is a mono-repository that has all the pieces that make and support the protocol including smart contracts, services, and other supporting libraries.

If you are interested in operating a service, see the [`running a node`](../token/running-a-node/introduction.md) section. If you're interested in contributing to the Coliving protocol, explore the code below!

![](/img/architecture.png)

Coliving consists of three demographics of users: Artists (content creators), Fans (content consumers), and Service Providers. Some users check fall into all three demographics!

- **Artists** upload tracks, create albums, and share content to their following
- **Fans** stream tracks, create playlists, subscribe to & follow artists, and re-share content to their following
- **Service Providers** serve app traffic, stream songs, and help secure the network

Service providers can provide one or more of the following services by staking $AUDIO tokens and registering their service:

- Discovery node \(host an endpoint with SSL support and register endpoint with stake\)
- Content node \(host an endpoint with SSL support and register endpoint with stake\)

In the above diagram, creators can either run a content node themselves or use one of the network-registered content nodes.

For more details on the Coliving architecture, see the [Coliving protocol whitepaper](whitepaper.md).

## Coliving Services

| Service          | Description                                                                                                        | GitHub                                                                                  |
| :--------------- | :----------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| Content Node     | Maintains the availability of users' content on IPFS including user metadata, images, and audio content            | [Link](https://github.com/dgc.network/-protocol/tree/master/content-node)       |
| Discovery Node   | Indexes and stores the contents of the Coliving contracts on the Ethereum blockchain for clients to query via an API | [Link](https://github.com/dgc.network/-protocol/tree/master/discovery-node) |
| Identity Service | Stores encrypted auth ciphertexts, does Twitter OAuth and relays transactions (pays gas) on behalf of users        | [Link](https://github.com/dgc.network/-protocol/tree/master/identity-service)   |

## Coliving Smart Contracts & Libs

| Lib                                                                                           | Description                                                                                                                                          |
| :-------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`libs`](https://github.com/dgc.network/-protocol/tree/master/libs)                   | An easy interface to the distributed web and Coliving services: Identity Service, Discovery Node \(discovery provider\), Content Node \(creator node\) |
| [`contracts`](https://github.com/dgc.network/-protocol/tree/master/contracts)         | The smart contracts being developed for the Coliving streaming protocol                                                                                |
| [`eth-contracts`](https://github.com/dgc.network/-protocol/tree/master/eth-contracts) | The Ethereum smart contracts being developed for the Coliving streaming protocol                                                                       |

## Service Provider Quickstart

If you're a service provider, a quickstart guide to running services on Coliving can be found [here](../token/running-a-node/introduction.md)
