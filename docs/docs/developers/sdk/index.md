---
id: "index"
title: "@coliving/sdk"
sidebar_label: "Readme"
sidebar_position: 0
custom_edit_url: null
---

# Coliving JavaScript SDK

## Overview

The Coliving JavaScript (TypeScript) SDK allows you to easily build on and interact with the Coliving protocol.
- ✍️ Log In with Coliving
- 🎵 Fetch and stream agreements
- 🔍 Search and display users, agreements, and contentLists

👷‍♀️ We're actively working on building out more SDK features and functionality - stay tuned!

## Installation

- [Node.js](#nodejs)
- [HTML + JS](#html--js)

### Node.js

#### 1. Install the SDK package using your preferred JS package manager

In your terminal, run:

```bash"
npm install web3 @coliving/sdk
```

#### 2. Initialize the SDK

```js
import { sdk } from '@coliving/sdk'

const colivingSdk = sdk({ appName: 'Name of your app goes here' })
```

#### 3. Make your first API call using the SDK!

```js
const agreement = await colivingSdk.agreements.getAgreement({ agreementId: 'D7KyD' })
console.log(agreement, 'Agreement fetched!')
```

#### Full example

```js title="app.js" showLineNumbers
import Web3 from 'web3'
import { sdk } from '@coliving/sdk'

// If running in a browser, set window.Web3
window.Web3 = Web3

const colivingSdk = sdk({ appName: 'Name of your app goes here' })

const agreement = await colivingSdk.agreements.getAgreement({ agreementId: 'D7KyD' })
console.log(agreement, 'Agreement fetched!')
```

> If your bundler doesn't automatically polyfill node libraries (like when using create-react-app v5) you will need to use the `web3` script tag instead of the `web3` npm package

### HTML + JS

#### 1. Include the SDK script tag

```html
<script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@coliving/sdk@latest/dist/sdk.min.js"></script>
```

The Coliving SDK will then be assigned to `window.colivingSdk`.

#### 2. Initialize the SDK

```js
const colivingSdk = window.colivingSdk({ appName: 'Name of your app goes here' })
```

#### 3. Make your first API call using the SDK!

```js
const agreement = await colivingSdk.agreements.getAgreement({ agreementId: 'D7KyD' })
```

#### Full example

```html title="index.html" showLineNumbers
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@coliving/sdk@latest/dist/sdk.min.js"></script>
    <script>
    	const fn = async () => {
        const colivingSdk = window.colivingSdk({
          appName: "My Example App",
        });
        const agreement = await colivingSdk.agreements.getAgreement({ agreementId: 'D7KyD' });
        console.log(agreement, "Agreement fetched!");
      }
      fn()
    </script>
  </head>
  <body>
    <h1>Example content</h1>
  </body>
</html>
```
