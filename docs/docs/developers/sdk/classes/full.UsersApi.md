---
id: "full.UsersApi"
title: "Class: UsersApi"
sidebar_label: "UsersApi"
custom_edit_url: null
---

[full](../namespaces/full.md).UsersApi

## Hierarchy

- `BaseAPI`

  ↳ **`UsersApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](full.Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getDigitalContentsByUser

**getDigitalContentsByUser**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the digitalContents created by a user using their user ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentsByUserRequest`](../interfaces/full.GetDigitalContentsByUserRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getDigitalContentsByUserHandle

**getDigitalContentsByUserHandle**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the digitalContents created by a user using the user\'s handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentsByUserHandleRequest`](../interfaces/full.GetDigitalContentsByUserHandleRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getFavorites

**getFavorites**(`requestParameters`): `Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

Gets a user\'s favorite digitalContents

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFavoritesRequest`](../interfaces/full.GetFavoritesRequest.md) |

#### Returns

`Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

___

### getFollowers

**getFollowers**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

All users that follow the provided user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFollowersRequest`](../interfaces/full.GetFollowersRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getFollowings

**getFollowings**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

All users that the provided user follows

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFollowingsRequest`](../interfaces/full.GetFollowingsRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getRelatedUsers

**getRelatedUsers**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Gets a list of users that might be of interest to followers of this user.

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRelatedUsersRequest`](../interfaces/full.GetRelatedUsersRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getReposts

**getReposts**(`requestParameters`): `Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

Gets the given user\'s reposts

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRepostsRequest`](../interfaces/full.GetRepostsRequest.md) |

#### Returns

`Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

___

### getRepostsByHandle

**getRepostsByHandle**(`requestParameters`): `Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

Gets the user\'s reposts by the user handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRepostsByHandleRequest`](../interfaces/full.GetRepostsByHandleRequest.md) |

#### Returns

`Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

___

### getSupporter

**getSupporter**(`requestParameters`): `Promise`<[`FullSupporter`](../interfaces/full.FullSupporter.md)\>

Gets the specified supporter of the given user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupporterRequest`](../interfaces/full.GetSupporterRequest.md) |

#### Returns

`Promise`<[`FullSupporter`](../interfaces/full.FullSupporter.md)\>

___

### getSupporters

**getSupporters**(`requestParameters`): `Promise`<[`FullSupporter`](../interfaces/full.FullSupporter.md)[]\>

Gets the supporters of the given user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportersRequest`](../interfaces/full.GetSupportersRequest.md) |

#### Returns

`Promise`<[`FullSupporter`](../interfaces/full.FullSupporter.md)[]\>

___

### getSupporting

**getSupporting**(`requestParameters`): `Promise`<[`FullSupporting`](../interfaces/full.FullSupporting.md)\>

Gets the support from the given user to the supported user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportingRequest`](../interfaces/full.GetSupportingRequest.md) |

#### Returns

`Promise`<[`FullSupporting`](../interfaces/full.FullSupporting.md)\>

___

### getSupportings

**getSupportings**(`requestParameters`): `Promise`<[`FullSupporting`](../interfaces/full.FullSupporting.md)\>

Gets the users that the given user supports

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportingsRequest`](../interfaces/full.GetSupportingsRequest.md) |

#### Returns

`Promise`<[`FullSupporting`](../interfaces/full.FullSupporting.md)\>

___

### getTopUsers

**getTopUsers**(`requestParameters?`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get the Top Users having at least one digital_content by follower count

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTopUsersRequest`](../interfaces/full.GetTopUsersRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getTopUsersInGenre

**getTopUsersInGenre**(`requestParameters?`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get the Top Users for a Given Genre

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTopUsersInGenreRequest`](../interfaces/full.GetTopUsersInGenreRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUser

**getUser**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Gets a single user by their user ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUserRequest`](../interfaces/full.GetUserRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUserByHandle

**getUserByHandle**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Gets a single user by their handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUserByHandleRequest`](../interfaces/full.GetUserByHandleRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUsersDigitalContentHistory

**getUsersDigitalContentHistory**(`requestParameters`): `Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>

Get the digitalContents the user recently listened to.

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersDigitalContentHistoryRequest`](../interfaces/full.GetUsersDigitalContentHistoryRequest.md) |

#### Returns

`Promise`<[`ActivityFull`](../interfaces/full.ActivityFull.md)[]\>
