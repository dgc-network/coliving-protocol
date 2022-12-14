---
id: "ContentListsApi"
title: "ContentLists"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### getContentList

**getContentList**(`requestParameters`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Get a contentList by ID

Example:

```typescript

const contentList = await colivingSdk.contentLists.getContentList({
    contentListId: "AxRP0",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListRequest`](../interfaces/GetContentListRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

___

### getContentListDigitalContents

**getContentListDigitalContents**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Fetch digitalContents within a contentList.

Example:

```typescript

const digitalContents = await colivingSdk.contentLists.getContentListDigitalContents({
    contentListId: "AxRP0",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListDigitalContentsRequest`](../interfaces/GetContentListDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

___

### getTrendingContentLists

**getTrendingContentLists**(`requestParameters?`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Gets trending contentLists for a time period

Example:

```typescript

const contentLists = await colivingSdk.contentLists.getTrendingContentLists();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingContentListsRequest`](../interfaces/GetTrendingContentListsRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

___

### searchContentLists

**searchContentLists**(`requestParameters`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Search for a contentList

Example:

```typescript

const contentLists = await colivingSdk.contentLists.searchContentLists({
    query: 'lo-fi',
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchContentListsRequest`](../interfaces/SearchContentListsRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>
