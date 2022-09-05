---
id: "full.SearchApi"
title: "Class: SearchApi"
sidebar_label: "SearchApi"
custom_edit_url: null
---

[full](../namespaces/full.md).SearchApi

## Hierarchy

- `BaseAPI`

  ↳ **`SearchApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](full.Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### search

**search**(`requestParameters`): `Promise`<[`SearchModel`](../interfaces/full.SearchModel.md)\>

Get Users/Agreements/ContentLists/Albums that best match the search query

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchRequest`](../interfaces/full.SearchRequest.md) |

#### Returns

`Promise`<[`SearchModel`](../interfaces/full.SearchModel.md)\>

___

### searchAutocomplete

**searchAutocomplete**(`requestParameters`): `Promise`<[`SearchModel`](../interfaces/full.SearchModel.md)\>

Same as search but optimized for quicker response at the cost of some entity information.
Get Users/Agreements/ContentLists/Albums that best match the search query

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchAutocompleteRequest`](../interfaces/full.SearchAutocompleteRequest.md) |

#### Returns

`Promise`<[`SearchModel`](../interfaces/full.SearchModel.md)\>
