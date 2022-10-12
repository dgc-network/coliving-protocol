---
id: "DigitalContentsApi"
title: "Class: DigitalContentsApi"
sidebar_label: "DigitalContentsApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `DigitalContentsApi`

  ↳ **`DigitalContentsApi`**

## Constructors

### constructor

**new DigitalContentsApi**(`configuration`, `discoveryNode`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [`Configuration`](Configuration.md) |
| `discoveryNode` | `DiscoveryNode` |

#### Overrides

GeneratedDigitalContentsApi.constructor

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

GeneratedDigitalContentsApi.configuration

___

### discoveryNode

 **discoveryNode**: `DiscoveryNode`

## Methods

### getDigitalContent

**getDigitalContent**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

Gets a digital_content by ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentRequest`](../interfaces/GetDigitalContentRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)\>

#### Inherited from

GeneratedDigitalContentsApi.getDigitalContent

___

### getBulkDigitalContents

**getBulkDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets a list of digitalContents using their IDs or permalinks

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkDigitalContentsRequest`](../interfaces/GetBulkDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

#### Inherited from

GeneratedDigitalContentsApi.getBulkDigitalContents

___

### getTrendingDigitalContents

**getTrendingDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets the top 100 trending (most popular) digitalContents on Coliving

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

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`StreamDigitalContentRequest`](../interfaces/StreamDigitalContentRequest.md) |

#### Returns

`Promise`<`string`\>
