---
id: "ResolveApi"
title: "Class: ResolveApi"
sidebar_label: "ResolveApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `ResolveApi`

  ↳ **`ResolveApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

GeneratedResolveApi.configuration

## Methods

### resolve

**resolve**<`T`\>(`requestParameters`): `Promise`<`T`\>

Resolves a provided Coliving app URL to the API resource it represents

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Agreement`](../interfaces/Agreement.md) \| [`ContentList`](../interfaces/ContentList.md) \| [`User`](../interfaces/User.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`ResolveRequest`](../interfaces/ResolveRequest.md) |

#### Returns

`Promise`<`T`\>
