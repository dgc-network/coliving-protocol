---
id: "full.GetTrendingDigitalContentsWithVersionRequest"
title: "Interface: GetTrendingDigitalContentsWithVersionRequest"
sidebar_label: "GetTrendingDigitalContentsWithVersionRequest"
custom_edit_url: null
---

[full](../namespaces/full.md).GetTrendingDigitalContentsWithVersionRequest

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

 `Optional` **time**: [`GetTrendingDigitalContentsWithVersionTimeEnum`](../enums/full.GetTrendingDigitalContentsWithVersionTimeEnum.md)

Calculate trending over a specified time range

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### version

 **version**: `string`

The strategy version of trending to use
