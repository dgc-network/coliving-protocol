---
id: "TipsApi"
title: "Class: TipsApi"
sidebar_label: "TipsApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `BaseAPI`

  ↳ **`TipsApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getTips

**getTips**(`requestParameters?`): `Promise`<[`Tip`](../interfaces/Tip.md)[]\>

Gets the most recent tips on the network

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTipsRequest`](../interfaces/GetTipsRequest.md) |

#### Returns

`Promise`<[`Tip`](../interfaces/Tip.md)[]\>
