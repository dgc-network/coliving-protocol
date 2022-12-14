---
sidebar_label: Overview
sidebar_position: 1
---

# Overview

An Coliving Discovery Node is a service that indexes the metadata and availability of data across the protocol for Coliving users to query. The indexed content includes user, digital_content, and album/contentList information along with social features. The data is stored for quick access, updated on a regular interval, and made available for clients via a RESTful API.

[github repository](https://github.com/dgc-network/-protocol/tree/master/discovery-node)
[registered discovery nodes](https://dashboard..org/#/services/discovery-node)

Design Goals

1. Expose queryable endpoints which listeners/creators can interact with
2. Reliably store relevant blockchain events
3. Continuously monitor the blockchain and ensure stored data is up to date with the network

:::note

The Discovery Node may be referred to as the Discovery Node. These services are the same.

:::