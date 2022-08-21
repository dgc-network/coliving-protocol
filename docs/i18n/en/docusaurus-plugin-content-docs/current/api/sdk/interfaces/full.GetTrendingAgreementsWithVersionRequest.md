---
id: "full.GetTrendingAgreementsWithVersionRequest"
title: "Interface: GetTrendingAgreementsWithVersionRequest"
sidebar_label: "GetTrendingAgreementsWithVersionRequest"
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

[full](../namespaces/full.md).GetTrendingAgreementsWithVersionRequest

## Properties

### genre

 `Optional` **genre**: `string`

Filter trending to a specified genre

___

### limit

 `Optional` **limit**: `number`

The number of items to fetch

___

### offset

 `Optional` **offset**: `number`

The number of items to skip. Useful for pagination (page number * limit)

___

### time

 `Optional` **time**: [`GetTrendingAgreementsWithVersionTimeEnum`](../enums/full.GetTrendingAgreementsWithVersionTimeEnum.md)

Calculate trending over a specified time range

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### version

 **version**: `string`

The strategy version of trending to use
