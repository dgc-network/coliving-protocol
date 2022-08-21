---
id: "full.GetRecommendedAgreementsWithVersionRequest"
title: "Interface: GetRecommendedAgreementsWithVersionRequest"
sidebar_label: "GetRecommendedAgreementsWithVersionRequest"
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

[full](../namespaces/full.md).GetRecommendedAgreementsWithVersionRequest

## Properties

### exclusionList

 `Optional` **exclusionList**: `number`[]

List of agreement ids to exclude

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

 `Optional` **time**: [`GetRecommendedAgreementsWithVersionTimeEnum`](../enums/full.GetRecommendedAgreementsWithVersionTimeEnum.md)

Calculate trending over a specified time range

___

### userId

 `Optional` **userId**: `string`

The user ID of the user making the request

___

### version

 **version**: `string`

The strategy version of trending to use
