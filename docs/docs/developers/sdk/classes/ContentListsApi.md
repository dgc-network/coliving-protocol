---
id: "ContentListsApi"
title: "Class: ContentListsApi"
sidebar_label: "ContentListsApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `BaseAPI`

  ↳ **`ContentListsApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getContentList

**getContentList**(`requestParameters`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Get a contentList by ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListRequest`](../interfaces/GetContentListRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

___

### getContentListAgreements

**getContentListAgreements**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Fetch agreements within a contentList.

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetContentListAgreementsRequest`](../interfaces/GetContentListAgreementsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

___

### getTrendingContentLists

**getTrendingContentLists**(`requestParameters?`): `Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>

Gets trending contentLists for a time period

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

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchContentListsRequest`](../interfaces/SearchContentListsRequest.md) |

#### Returns

`Promise`<[`ContentList`](../interfaces/ContentList.md)[]\>
