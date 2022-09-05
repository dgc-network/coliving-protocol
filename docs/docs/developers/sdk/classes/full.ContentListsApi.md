---
id: "full.ContentListsApi"
title: "Class: ContentListsApi"
sidebar_label: "ContentListsApi"
custom_edit_url: null
---

[full](../namespaces/full.md).ContentListsApi

## Hierarchy

- `BaseAPI`

  ↳ **`ContentListsApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](full.Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getContentList

**getContentList**(`requestParameters`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

Get a contentList by ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListRequest`](../interfaces/full.GetContentListRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getTrendingContentLists

**getTrendingContentLists**(`requestParameters?`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

Returns trending contentLists for a time period

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingContentListsRequest`](../interfaces/full.GetTrendingContentListsRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getTrendingContentListsWithVersion

**getTrendingContentListsWithVersion**(`requestParameters`): `Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

Returns trending contentLists for a time period based on the given trending version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingContentListsWithVersionRequest`](../interfaces/full.GetTrendingContentListsWithVersionRequest.md) |

#### Returns

`Promise`<[`ContentListFull`](../interfaces/full.ContentListFull.md)[]\>

___

### getUsersFromContentListFavorites

**getUsersFromContentListFavorites**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that favorited a contentList

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromContentListFavoritesRequest`](../interfaces/full.GetUsersFromContentListFavoritesRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUsersFromContentListReposts

**getUsersFromContentListReposts**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that reposted a contentList

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromContentListRepostsRequest`](../interfaces/full.GetUsersFromContentListRepostsRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>
