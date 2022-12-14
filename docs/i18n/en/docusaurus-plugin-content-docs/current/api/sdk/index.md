---
id: "index"
title: "@/sdk"
sidebar_label: "Readme"
sidebar_position: 0
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

# Coliving JavaScript SDK

## Overview

The Coliving SDK allows you to easily build upon and interact with the Coliving network. Currently, we only have a Typescript/Javascript SDK.

We're actively working on building out more SDK features and functionality - stay tuned!

## Installation

- [In the browser/Vanilla JS](#in-the-browservanilla-js)
- [In Node.js](#in-nodejs)

### In the browser/Vanilla JS

#### 0. Include Web3.js

```html
<script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
```

#### 1. Include the SDK script tag

```html
<!-- Put this AFTER web3.js -->
<script src="https://cdn.jsdelivr.net/npm/@/sdk@latest/dist/sdk.min.js"></script>
```

The Coliving SDK will then be assigned to `window.colivingSdk`.

#### 2. Initialize the SDK

```js
const colivingSdk = window.colivingSdk({ appName: 'Name of your app goes here' })
```

#### 3. Make your first API call using the SDK!

```js
const digitalContents = await colivingSdk.discoveryNode.getDigitalContents()
```

#### Full example

```html title="index.html"
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@/sdk@latest/dist/sdk.min.js"></script>
    <script>
      const colivingSdk = window.colivingSdk({
        appName: "My Example App",
      });
      const digitalContents = await colivingSdk.discoveryNode.getDigitalContents();
      console.log(digitalContents, "DigitalContents fetched!");
    </script>
  </head>
  <body>
    <h1>Example content</h1>
  </body>
</html>
```

### In Node.js

#### 0. Install the SDK package using your preferred JS package manager

In your terminal, run:

```bash"
npm install @/sdk
```

#### 1. [Skip if not in browser environment] Install web3.js

In your terminal, run:

```bash"
npm install web3
```

#### 2. [Skip if not in browser environment] Assign web3.js to `window.Web3`

```js
import Web3 from 'web3'
window.Web3 = Web3
```

#### 3. Initialize the SDK

```js
import { sdk } from '@/sdk'

const colivingSdk = sdk({ appName: 'Name of your app goes here' })
```

#### 4. Make your first API call using the SDK!

```js
const digitalContents = await colivingSdk.discoveryNode.getDigitalContents()
console.log(digitalContents, 'DigitalContents fetched!')
```

#### Full example

```js title="app.js"
import Web3 from 'web3'
import { sdk } from '@/sdk'

window.Web3 = Web3
const colivingSdk = sdk({ appName: 'My Example App' })
const digitalContents = await colivingSdk.discoveryNode.getDigitalContents()
console.log(digitalContents, 'DigitalContents fetched!')
```
