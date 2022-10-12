---
id: "ResolveApi"
title: "Resolve"
sidebar_position: 0
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

## Methods

### resolve

**resolve**<`T`\>(`requestParameters`): `Promise`<`T`\>

Resolves a provided Coliving app URL to the API resource it represents

Example:

```typescript

const digital_content = await colivingSdk.resolve<DigitalContent>({
  url: "https://.co/camouflybeats/hypermantra-86216",
});

```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`DigitalContent`](../interfaces/DigitalContent.md) \| [`ContentList`](../interfaces/ContentList.md) \| [`User`](../interfaces/User.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`ResolveRequest`](../interfaces/ResolveRequest.md) |

#### Returns

`Promise`<`T`\>
