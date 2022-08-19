---
id: "full.GetTrendingAgreementsRequest"
title: "Interface: GetTrendingAgreementsRequest"
sidebar_label: "GetTrendingAgreementsRequest"
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

[full](../namespaces/full.md).GetTrendingAgreementsRequest

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

 `Optional` **time**: [`GetTrendingAgreementsTimeEnum`](../enums/full.GetTrendingAgreementsTimeEnum.md)

Calculate trending over a specified time range

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request
