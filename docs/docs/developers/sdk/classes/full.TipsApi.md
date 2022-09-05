---
id: "full.TipsApi"
title: "Class: TipsApi"
sidebar_label: "TipsApi"
custom_edit_url: null
---

[full](../namespaces/full.md).TipsApi

## Hierarchy

- `BaseAPI`

  ↳ **`TipsApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](full.Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getTips

**getTips**(`requestParameters?`): `Promise`<[`FullTip`](../interfaces/full.FullTip.md)[]\>

Gets the most recent tips on the network

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTipsRequest`](../interfaces/full.GetTipsRequest.md) |

#### Returns

`Promise`<[`FullTip`](../interfaces/full.FullTip.md)[]\>
