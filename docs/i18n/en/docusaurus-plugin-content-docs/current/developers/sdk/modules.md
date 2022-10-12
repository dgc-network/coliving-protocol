---
id: "modules"
title: "@/sdk"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Namespaces

- [full](namespaces/full.md)

## Enumerations

- [GetTipsCurrentUserFollowsEnum](enums/GetTipsCurrentUserFollowsEnum.md)
- [GetTipsUniqueByEnum](enums/GetTipsUniqueByEnum.md)
- [GetDigitalContentsByUserSortEnum](enums/GetDigitalContentsByUserSortEnum.md)
- [GetTrendingContentListsTimeEnum](enums/GetTrendingContentListsTimeEnum.md)
- [GetTrendingDigitalContentsTimeEnum](enums/GetTrendingDigitalContentsTimeEnum.md)

## Classes

- [Configuration](classes/Configuration.md)
- [ContentLists](classes/ContentListsApi.md)
- [Resolve](classes/ResolveApi.md)
- [Tips](classes/TipsApi.md)
- [DigitalContents](classes/DigitalContentsApi.md)
- [Users](classes/UsersApi.md)

## Interfaces

- [Activity](interfaces/Activity.md)
- [ConfigurationParameters](interfaces/ConfigurationParameters.md)
- [ConnectedWallets](interfaces/ConnectedWallets.md)
- [ConnectedWalletsResponse](interfaces/ConnectedWalletsResponse.md)
- [CoverPhoto](interfaces/CoverPhoto.md)
- [DecodedUserToken](interfaces/DecodedUserToken.md)
- [EncodedUserId](interfaces/EncodedUserId.md)
- [Favorite](interfaces/Favorite.md)
- [FavoritesResponse](interfaces/FavoritesResponse.md)
- [GetBulkDigitalContentsRequest](interfaces/GetBulkDigitalContentsRequest.md)
- [GetConnectedWalletsRequest](interfaces/GetConnectedWalletsRequest.md)
- [GetFavoritesRequest](interfaces/GetFavoritesRequest.md)
- [GetContentListRequest](interfaces/GetContentListRequest.md)
- [GetContentListDigitalContentsRequest](interfaces/GetContentListDigitalContentsRequest.md)
- [GetRepostsRequest](interfaces/GetRepostsRequest.md)
- [GetSupporters](interfaces/GetSupporters.md)
- [GetSupportersRequest](interfaces/GetSupportersRequest.md)
- [GetSupporting](interfaces/GetSupporting.md)
- [GetSupportingsRequest](interfaces/GetSupportingsRequest.md)
- [GetTipsRequest](interfaces/GetTipsRequest.md)
- [GetTipsResponse](interfaces/GetTipsResponse.md)
- [GetTopDigitalContentTagsRequest](interfaces/GetTopDigitalContentTagsRequest.md)
- [GetDigitalContentRequest](interfaces/GetDigitalContentRequest.md)
- [GetDigitalContentsByUserRequest](interfaces/GetDigitalContentsByUserRequest.md)
- [GetTrendingContentListsRequest](interfaces/GetTrendingContentListsRequest.md)
- [GetTrendingDigitalContentsRequest](interfaces/GetTrendingDigitalContentsRequest.md)
- [GetUserIDFromWalletRequest](interfaces/GetUserIDFromWalletRequest.md)
- [GetUserRequest](interfaces/GetUserRequest.md)
- [ContentList](interfaces/ContentList.md)
- [ContentListArtwork](interfaces/ContentListArtwork.md)
- [ContentListResponse](interfaces/ContentListResponse.md)
- [ContentListSearchResult](interfaces/ContentListSearchResult.md)
- [ContentListDigitalContentsResponse](interfaces/ContentListDigitalContentsResponse.md)
- [ProfilePicture](interfaces/ProfilePicture.md)
- [RemixParent](interfaces/RemixParent.md)
- [Reposts](interfaces/Reposts.md)
- [ResolveRequest](interfaces/ResolveRequest.md)
- [SearchContentListsRequest](interfaces/SearchContentListsRequest.md)
- [SearchDigitalContentsRequest](interfaces/SearchDigitalContentsRequest.md)
- [SearchUsersRequest](interfaces/SearchUsersRequest.md)
- [StreamDigitalContentRequest](interfaces/StreamDigitalContentRequest.md)
- [Supporter](interfaces/Supporter.md)
- [Supporting](interfaces/Supporting.md)
- [TagsResponse](interfaces/TagsResponse.md)
- [Tip](interfaces/Tip.md)
- [DigitalContent](interfaces/DigitalContent.md)
- [DigitalContentArtwork](interfaces/DigitalContentArtwork.md)
- [DigitalContentElement](interfaces/DigitalContentElement.md)
- [DigitalContentResponse](interfaces/DigitalContentResponse.md)
- [DigitalContentSearch](interfaces/DigitalContentSearch.md)
- [DigitalContentsResponse](interfaces/DigitalContentsResponse.md)
- [TrendingContentListsResponse](interfaces/TrendingContentListsResponse.md)
- [User](interfaces/User.md)
- [UserAssociatedWalletResponse](interfaces/UserAssociatedWalletResponse.md)
- [UserResponse](interfaces/UserResponse.md)
- [UserSearch](interfaces/UserSearch.md)
- [VerifyIDTokenRequest](interfaces/VerifyIDTokenRequest.md)
- [VerifyToken](interfaces/VerifyToken.md)

## Type Aliases

### FetchAPI

 **FetchAPI**: (`url`: `string`, `init?`: `RequestInit`) => `Promise`<`unknown`\>

#### Type declaration

(`url`, `init?`): `Promise`<`unknown`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `init?` | `RequestInit` |

##### Returns

`Promise`<`unknown`\>

## Functions

### sdk

**sdk**(`config`): `Object`

The Coliving SDK

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SdkConfig` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `full` | { `contentLists`: `ContentListsApi` ; `reactions`: `ReactionsApi` ; `search`: `SearchApi` ; `tips`: `TipsApi` ; `digitalContents`: `DigitalContentsApi` ; `users`: `UsersApi`  } |
| `full.contentLists` | `ContentListsApi` |
| `full.reactions` | `ReactionsApi` |
| `full.search` | `SearchApi` |
| `full.tips` | `TipsApi` |
| `full.digitalContents` | `DigitalContentsApi` |
| `full.users` | `UsersApi` |
| `oauth` | `undefined` \| `Oauth` |
| `contentLists` | [`ContentLists`](classes/ContentListsApi.md) |
| `resolve` | <T\>(`requestParameters`: [`ResolveRequest`](interfaces/ResolveRequest.md)) => `Promise`<`T`\> |
| `tips` | [`Tips`](classes/TipsApi.md) |
| `digitalContents` | [`DigitalContents`](classes/DigitalContentsApi.md) |
| `users` | [`Users`](classes/UsersApi.md) |
