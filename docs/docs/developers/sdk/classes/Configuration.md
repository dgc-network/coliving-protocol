---
id: "Configuration"
title: "Class: Configuration"
sidebar_label: "Configuration"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

**new Configuration**(`configuration`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [`ConfigurationParameters`](../interfaces/ConfigurationParameters.md) |

## Accessors

### accessToken

`get` **accessToken**(): `undefined` \| (`name?`: `string`, `scopes?`: `string`[]) => `string` \| `Promise`<`string`\>

#### Returns

`undefined` \| (`name?`: `string`, `scopes?`: `string`[]) => `string` \| `Promise`<`string`\>

___

### apiKey

`get` **apiKey**(): `undefined` \| (`name`: `string`) => `string`

#### Returns

`undefined` \| (`name`: `string`) => `string`

___

### basePath

`get` **basePath**(): `string`

#### Returns

`string`

___

### credentials

`get` **credentials**(): `undefined` \| `RequestCredentials`

#### Returns

`undefined` \| `RequestCredentials`

___

### fetchApi

`get` **fetchApi**(): [`FetchAPI`](../modules.md#fetchapi)

#### Returns

[`FetchAPI`](../modules.md#fetchapi)

___

### headers

`get` **headers**(): `undefined` \| `HTTPHeaders`

#### Returns

`undefined` \| `HTTPHeaders`

___

### middleware

`get` **middleware**(): `Middleware`[]

#### Returns

`Middleware`[]

___

### password

`get` **password**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

___

### queryParamsStringify

`get` **queryParamsStringify**(): (`params`: `HTTPQuery`) => `string`

#### Returns

`fn`

(`params`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `HTTPQuery` |

##### Returns

`string`

___

### username

`get` **username**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`
