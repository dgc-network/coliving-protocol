---
id: "AgreementsApi"
title: "Agreements"
sidebar_position: 0
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

## Methods

### getBulkAgreements

**getBulkAgreements**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

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

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedAgreementsApi.getBulkAgreements

___

### getAgreement

**getAgreement**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

Gets a digital_content by ID

Example:

```typescript

const digital_content = await colivingSdk.agreements.getAgreement({
    agreementId: "D7KyD",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRequest`](../interfaces/GetAgreementRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

#### Inherited from

GeneratedAgreementsApi.getAgreement

___

### getTrendingAgreements

**getTrendingAgreements**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

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

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedAgreementsApi.getTrendingAgreements

___

### searchAgreements

**searchAgreements**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Search for a digital_content or agreements

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

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedAgreementsApi.searchAgreements

___

### streamAgreement

**streamAgreement**(`requestParameters`): `Promise`<`string`\>

Get the url of the digital_content's streamable mp3 file

Example:

```typescript

const url = await colivingSdk.agreements.streamAgreement({
    agreementId: "PjdWN",
});
const digitalcoin = new Audio(url);
digitalcoin.play();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`StreamAgreementRequest`](../interfaces/StreamAgreementRequest.md) |

#### Returns

`Promise`<`string`\>
