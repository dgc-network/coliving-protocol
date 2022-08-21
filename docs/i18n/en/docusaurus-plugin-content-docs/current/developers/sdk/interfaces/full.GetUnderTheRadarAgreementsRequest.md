---
id: "full.GetUnderTheRadarAgreementsRequest"
title: "Interface: GetUnderTheRadarAgreementsRequest"
sidebar_label: "GetUnderTheRadarAgreementsRequest"
custom_edit_url: null
---

[full](../namespaces/full.md).GetUnderTheRadarAgreementsRequest

## Properties

### filter

 `Optional` **filter**: [`GetUnderTheRadarAgreementsFilterEnum`](../enums/full.GetUnderTheRadarAgreementsFilterEnum.md)

Filters for activity that is original vs reposts

___

### limit

 `Optional` **limit**: `number`

The number of items to fetch

___

### offset

 `Optional` **offset**: `number`

The number of items to skip. Useful for pagination (page number * limit)

___

### agreementsOnly

 `Optional` **agreementsOnly**: `boolean`

Whether to only include agreements

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### withUsers

 `Optional` **withUsers**: `boolean`

Boolean to include user info with agreements
