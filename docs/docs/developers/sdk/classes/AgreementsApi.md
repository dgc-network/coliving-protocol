---
id: "AgreementsApi"
title: "Class: AgreementsApi"
sidebar_label: "AgreementsApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `AgreementsApi`

  ↳ **`AgreementsApi`**

## Constructors

### constructor

**new AgreementsApi**(`configuration`, `discoveryNode`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [`Configuration`](Configuration.md) |
| `discoveryNode` | `DiscoveryNode` |

#### Overrides

GeneratedAgreementsApi.constructor

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

GeneratedAgreementsApi.configuration

___

### discoveryNode

 **discoveryNode**: `DiscoveryNode`

## Methods

### getAgreement

**getAgreement**(`requestParameters`): `Promise`<[`Agreement`](../interfaces/Agreement.md)\>

Gets a agreement by ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRequest`](../interfaces/GetAgreementRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)\>

#### Inherited from

GeneratedAgreementsApi.getAgreement

___

### getBulkAgreements

**getBulkAgreements**(`requestParameters?`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Gets a list of agreements using their IDs or permalinks

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkAgreementsRequest`](../interfaces/GetBulkAgreementsRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

#### Inherited from

GeneratedAgreementsApi.getBulkAgreements

___

### getTrendingAgreements

**getTrendingAgreements**(`requestParameters?`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Gets the top 100 trending (most popular) agreements on Coliving

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingAgreementsRequest`](../interfaces/GetTrendingAgreementsRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

#### Inherited from

GeneratedAgreementsApi.getTrendingAgreements

___

### searchAgreements

**searchAgreements**(`requestParameters`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Search for a agreement or agreements

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchAgreementsRequest`](../interfaces/SearchAgreementsRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

#### Inherited from

GeneratedAgreementsApi.searchAgreements

___

### streamAgreement

**streamAgreement**(`requestParameters`): `Promise`<`string`\>

Get the url of the agreement's streamable mp3 file

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`StreamAgreementRequest`](../interfaces/StreamAgreementRequest.md) |

#### Returns

`Promise`<`string`\>
