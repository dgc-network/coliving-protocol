---
id: "full.ContentListsApi"
title: "ContentLists"
sidebar_position: 0
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

## Methods

### getContentList

**getContentList**(`requestParameters`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

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
| `requestParameters` | [`GetContentListRequest`](../interfaces/full.GetContentListRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getTrendingContentLists

**getTrendingContentLists**(`requestParameters?`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

Returns trending content lists for a time period

Example:

```typescript

const content lists = await colivingSdk.content lists.getTrendingContentLists();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingContentListsRequest`](../interfaces/full.GetTrendingContentListsRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getTrendingContentListsWithVersion

**getTrendingContentListsWithVersion**(`requestParameters`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

Returns trending content lists for a time period based on the given trending version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingContentListsWithVersionRequest`](../interfaces/full.GetTrendingContentListsWithVersionRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getUsersFromContentListFavorites

**getUsersFromContentListFavorites**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that favorited a content list

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromContentListFavoritesRequest`](../interfaces/full.GetUsersFromContentListFavoritesRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUsersFromContentListReposts

**getUsersFromContentListReposts**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that reposted a content list

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromContentListRepostsRequest`](../interfaces/full.GetUsersFromContentListRepostsRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>
