---
id: "full.GetRecommendedDigitalContentsWithVersionRequest"
title: "Interface: GetRecommendedDigitalContentsWithVersionRequest"
sidebar_label: "GetRecommendedDigitalContentsWithVersionRequest"
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

[full](../namespaces/full.md).GetRecommendedDigitalContentsWithVersionRequest

## Properties

### exclusionList

 `Optional` **exclusionList**: `number`[]

List of digital_content ids to exclude

___

### genre

 `Optional` **genre**: `string`

Filter trending to a specified genre

___

### limit

 `Optional` **limit**: `number`

The number of items to fetch

___

### time

 `Optional` **time**: [`GetRecommendedDigitalContentsWithVersionTimeEnum`](../enums/full.GetRecommendedDigitalContentsWithVersionTimeEnum.md)

Calculate trending over a specified time range

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### version

 **version**: `string`

The strategy version of trending to use
