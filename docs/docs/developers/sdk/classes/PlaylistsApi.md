---
id: "ContentListsApi"
title: "ContentLists"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### getContentList

**getContentList**(`requestParameters`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Get a content list by ID

Example:

```typescript

const content list = await colivingSdk.content lists.getContentList({
    content listId: "AxRP0",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListRequest`](../interfaces/GetContentListRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

___

### getContentListAgreements

**getContentListAgreements**(`requestParameters`): `Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

Fetch agreements within a content list.

Example:

```typescript

const agreements = await colivingSdk.content lists.getContentListAgreements({
    content listId: "AxRP0",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListAgreementsRequest`](../interfaces/GetContentListAgreementsRequest.md) |

#### Returns

`Promise`<[`Agreement`](../interfaces/Agreement.md)[]\>

___

### getTrendingContentLists

**getTrendingContentLists**(`requestParameters?`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Gets trending content lists for a time period

Example:

```typescript

const content lists = await colivingSdk.content lists.getTrendingContentLists();

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

Search for a content list

Example:

```typescript

const content lists = await colivingSdk.content lists.searchContentLists({
    query: 'lo-fi',
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchContentListsRequest`](../interfaces/SearchContentListsRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>
