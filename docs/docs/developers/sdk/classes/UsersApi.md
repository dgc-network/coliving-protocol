---
id: "UsersApi"
title: "Class: UsersApi"
sidebar_label: "UsersApi"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `BaseAPI`

  ↳ **`UsersApi`**

## Properties

### configuration

 `Protected` **configuration**: [`Configuration`](Configuration.md)

#### Inherited from

runtime.BaseAPI.configuration

## Methods

### getDigitalContentsByUser

**getDigitalContentsByUser**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets the digitalContents created by a user using their user ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentsByUserRequest`](../interfaces/GetDigitalContentsByUserRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

___

### getDigitalContentsByUserHandle

**getDigitalContentsByUserHandle**(`requestParameters`): `Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

Gets the digitalContents created by a user using the user\'s handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentsByUserHandleRequest`](../interfaces/GetDigitalContentsByUserHandleRequest.md) |

#### Returns

`Promise`<[`DigitalContent`](../interfaces/DigitalContent.md)[]\>

___

### getConnectedWallets

**getConnectedWallets**(`requestParameters`): `Promise`<[`ConnectedWallets`](../interfaces/ConnectedWallets.md)\>

Get the User\'s ERC and SPL connected wallets

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetConnectedWalletsRequest`](../interfaces/GetConnectedWalletsRequest.md) |

#### Returns

`Promise`<[`ConnectedWallets`](../interfaces/ConnectedWallets.md)\>

___

### getFavorites

**getFavorites**(`requestParameters`): `Promise`<[`Favorite`](../interfaces/Favorite.md)[]\>

Gets a user\'s favorite digitalContents

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFavoritesRequest`](../interfaces/GetFavoritesRequest.md) |

#### Returns

`Promise`<[`Favorite`](../interfaces/Favorite.md)[]\>

___

### getFollowers

**getFollowers**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)[]\>

All users that follow the provided user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFollowersRequest`](../interfaces/GetFollowersRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### getFollowings

**getFollowings**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)[]\>

All users that the provided user follows

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetFollowingsRequest`](../interfaces/GetFollowingsRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### getRelatedUsers

**getRelatedUsers**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)[]\>

Gets a list of users that might be of interest to followers of this user.

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRelatedUsersRequest`](../interfaces/GetRelatedUsersRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### getReposts

**getReposts**(`requestParameters`): `Promise`<[`Activity`](../interfaces/Activity.md)[]\>

Gets the given user\'s reposts

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRepostsRequest`](../interfaces/GetRepostsRequest.md) |

#### Returns

`Promise`<[`Activity`](../interfaces/Activity.md)[]\>

___

### getRepostsByHandle

**getRepostsByHandle**(`requestParameters`): `Promise`<[`Activity`](../interfaces/Activity.md)[]\>

Gets the user\'s reposts by the user handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRepostsByHandleRequest`](../interfaces/GetRepostsByHandleRequest.md) |

#### Returns

`Promise`<[`Activity`](../interfaces/Activity.md)[]\>

___

### getSupporter

**getSupporter**(`requestParameters`): `Promise`<[`Supporter`](../interfaces/Supporter.md)\>

Gets the specified supporter of the given user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupporterRequest`](../interfaces/GetSupporterRequest.md) |

#### Returns

`Promise`<[`Supporter`](../interfaces/Supporter.md)\>

___

### getSupporters

**getSupporters**(`requestParameters`): `Promise`<[`Supporter`](../interfaces/Supporter.md)[]\>

Gets the supporters of the given user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportersRequest`](../interfaces/GetSupportersRequest.md) |

#### Returns

`Promise`<[`Supporter`](../interfaces/Supporter.md)[]\>

___

### getSupporting

**getSupporting**(`requestParameters`): `Promise`<[`Supporting`](../interfaces/Supporting.md)[]\>

Gets the support from the given user to the supported user

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportingRequest`](../interfaces/GetSupportingRequest.md) |

#### Returns

`Promise`<[`Supporting`](../interfaces/Supporting.md)[]\>

___

### getSupportings

**getSupportings**(`requestParameters`): `Promise`<[`Supporting`](../interfaces/Supporting.md)[]\>

Gets the users that the given user supports

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetSupportingsRequest`](../interfaces/GetSupportingsRequest.md) |

#### Returns

`Promise`<[`Supporting`](../interfaces/Supporting.md)[]\>

___

### getTopDigitalContentTags

**getTopDigitalContentTags**(`requestParameters`): `Promise`<`string`[]\>

Gets the most used digital_content tags by a user.
Fetch most used tags in a user\'s digitalContents

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTopDigitalContentTagsRequest`](../interfaces/GetTopDigitalContentTagsRequest.md) |

#### Returns

`Promise`<`string`[]\>

___

### getTopUsers

**getTopUsers**(`requestParameters?`): `Promise`<[`User`](../interfaces/User.md)[]\>

Get the Top Users having at least one digital_content by follower count

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTopUsersRequest`](../interfaces/GetTopUsersRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### getTopUsersInGenre

**getTopUsersInGenre**(`requestParameters?`): `Promise`<[`User`](../interfaces/User.md)[]\>

Get the Top Users for a Given Genre

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTopUsersInGenreRequest`](../interfaces/GetTopUsersInGenreRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### getUser

**getUser**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)\>

Gets a single user by their user ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUserRequest`](../interfaces/GetUserRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)\>

___

### getUserByHandle

**getUserByHandle**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)\>

Gets a single user by their handle

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUserByHandleRequest`](../interfaces/GetUserByHandleRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)\>

___

### getUserIDFromWallet

**getUserIDFromWallet**(`requestParameters`): `Promise`<[`EncodedUserId`](../interfaces/EncodedUserId.md)\>

Gets a User ID from an associated wallet address

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUserIDFromWalletRequest`](../interfaces/GetUserIDFromWalletRequest.md) |

#### Returns

`Promise`<[`EncodedUserId`](../interfaces/EncodedUserId.md)\>

___

### getUsersDigitalContentHistory

**getUsersDigitalContentHistory**(`requestParameters`): `Promise`<[`Activity`](../interfaces/Activity.md)[]\>

Get the digitalContents the user recently listened to.

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersDigitalContentHistoryRequest`](../interfaces/GetUsersDigitalContentHistoryRequest.md) |

#### Returns

`Promise`<[`Activity`](../interfaces/Activity.md)[]\>

___

### searchUsers

**searchUsers**(`requestParameters`): `Promise`<[`User`](../interfaces/User.md)[]\>

Search for users that match the given query

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`SearchUsersRequest`](../interfaces/SearchUsersRequest.md) |

#### Returns

`Promise`<[`User`](../interfaces/User.md)[]\>

___

### verifyIDToken

**verifyIDToken**(`requestParameters`): `Promise`<[`DecodedUserToken`](../interfaces/DecodedUserToken.md)\>

Verify if the given jwt ID token was signed by the subject (user) in the payload

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`VerifyIDTokenRequest`](../interfaces/VerifyIDTokenRequest.md) |

#### Returns

`Promise`<[`DecodedUserToken`](../interfaces/DecodedUserToken.md)\>
