---
id: "DigitalContentsApi"
title: "DigitalContents"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### getBulkDigitalContents

**getBulkDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets a list of digitalContents using their IDs or permalinks

Example:

```typescript

const digitalContents = await colivingSdk.digitalContents.getBulkDigitalContents();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkDigitalContentsRequest`](../interfaces/GetBulkDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedDigitalContentsApi.getBulkDigitalContents

___

### getDigitalContent

**getDigitalContent**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

Gets a digital_content by ID

Example:

```typescript

const digital_content = await colivingSdk.digitalContents.getDigitalContent({
    digitalContentId: "D7KyD",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentRequest`](../interfaces/GetDigitalContentRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

#### Inherited from

GeneratedDigitalContentsApi.getDigitalContent

___

### getTrendingDigitalContents

**getTrendingDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets the top 100 trending (most popular) digitalContents on Coliving

Example:

```typescript

const digitalContents = await colivingSdk.digitalContents.getTrendingDigitalContents();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingDigitalContentsRequest`](../interfaces/GetTrendingDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedDigitalContentsApi.getTrendingDigitalContents

___

### searchDigitalContents

**searchDigitalContents**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Search for a digital_content or digitalContents

Example:

```typescript

const searchResult = await colivingSdk.digitalContents.searchDigitalContents({
    query: "skrillex",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchDigitalContentsRequest`](../interfaces/SearchDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedDigitalContentsApi.searchDigitalContents

___

### streamDigitalContent

**streamDigitalContent**(`requestParameters`): `Promise`<`string`\>

Get the url of the digital_content's streamable mp3 file

Example:

```typescript

const url = await colivingSdk.digitalContents.streamDigitalContent({
    digitalContentId: "PjdWN",
});
const digitalcoin = new Audio(url);
digitalcoin.play();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`StreamDigitalContentRequest`](../interfaces/StreamDigitalContentRequest.md) |

#### Returns

`Promise`<`string`\>
