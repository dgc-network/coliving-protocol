---
id: "full.GetUnderTheRadarDigitalContentsRequest"
title: "Interface: GetUnderTheRadarDigitalContentsRequest"
sidebar_label: "GetUnderTheRadarDigitalContentsRequest"
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

[full](../namespaces/full.md).GetUnderTheRadarDigitalContentsRequest

## Properties

### filter

 `Optional` **filter**: [`GetUnderTheRadarDigitalContentsFilterEnum`](../enums/full.GetUnderTheRadarDigitalContentsFilterEnum.md)

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

### digitalContentsOnly

 `Optional` **digitalContentsOnly**: `boolean`

Whether to only include digitalContents

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### withUsers

 `Optional` **withUsers**: `boolean`

Boolean to include user info with digitalContents
