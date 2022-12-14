---
sidebar_label: Content Node
sidebar_position: 3
---

# Content Node

## Overview

An Coliving Content Node maintains the availability of all content in the network.  
Content types include user and digital_content metadata, user and digital_content images, and digitalcoin content.

*NOTE - Previously, there was a concept of a ”content node” that was separate from a content node. These have been combined into a single node type rather than being separate, with ”content node” referring to the merged type. Some references to ”content node” still exist in Coliving code and in other documentation; those can safely be assumed to be referring to the content nodes outlined here.*

All registered content nodes are visible here: https://dashboard..org/services/content-node

## Architecture

**Web Server**

The content node's core service is a web server with an HTTP API to process incoming requests and perform the following functions:

- user & digital_content metadata upload
- user & digital_content image upload
- user digital_content file upload
- user & digital_content data, metadata, and digital_content file retrieval

*The web server is a [NodeJS](https://nodejs.org) [Express app](https://expressjs.com/).*

**Persistent Storage (Postgres)**

It stores all data in a postgresql database and all images and metadata objects on its file system.

Pointers to all content and metadata stored on disk are persisted in the Postgres DB.

*Postgres is managed in the codebase using the [Sequelize ORM](https://sequelize.org/master/) which includes migrations, models and validations*

**Redis**

A [Redis client](https://redis.io/) is used for for resource locking, request rate limiting, and limited caching and key storage.

*Redis is managed in the codebase through the [ioredis](https://github.com/luin/ioredis) npm package*

**DigitalContent Segmenting**

As defined by the [Coliving protocol](https://whitepaper..co), the content node uses [FFMPEG](https://ffmpeg.org/ffmpeg.html) to segment & transcode all uploaded digital_content files before storing/serving.

**Data Redundancy**

As defined by the [Coliving protocol](https://whitepaper..co), all content is stored redundantly across multiple nodes to maximize availability. This is all done automatically - every node monitors every other node in the network to ensure minimum redundancy of all data, transfering files as required.
