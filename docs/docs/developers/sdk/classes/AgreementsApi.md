---
id: "AgreementsApi"
title: "Agreements"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### getBulkAgreements

**getBulkAgreements**(`requestParameters?`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Gets a list of agreements using their IDs or permalinks

Example:

```typescript

const agreements = await colivingSdk.agreements.getBulkAgreements();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkAgreementsRequest`](../interfaces/GetBulkAgreementsRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

#### Inherited from

GeneratedAgreementsApi.getBulkAgreements

___

### getAgreement

**getAgreement**(`requestParameters`): `Promise`<[`Agreement`](../interfaces/Agreement.md)\>

Gets a agreement by ID

Example:

```typescript

const agreement = await colivingSdk.agreements.getAgreement({
    agreementId: "D7KyD",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRequest`](../interfaces/GetAgreementRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)\>

#### Inherited from

GeneratedAgreementsApi.getAgreement

___

### getTrendingAgreements

**getTrendingAgreements**(`requestParameters?`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Gets the top 100 trending (most popular) agreements on Coliving

Example:

```typescript

const agreements = await colivingSdk.agreements.getTrendingAgreements();

```

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

Example:

```typescript

const searchResult = await colivingSdk.agreements.searchAgreements({
    query: "skrillex",
});

```

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

Example:

```typescript

const url = await colivingSdk.agreements.streamAgreement({
    agreementId: "PjdWN",
});
const live = new Audio(url);
live.play();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`StreamAgreementRequest`](../interfaces/StreamAgreementRequest.md) |

#### Returns

`Promise`<`string`\>
