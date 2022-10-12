---
id: "modules"
title: "@coliving/sdk"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Namespaces

- [full](namespaces/full.md)

## Enumerations

- [GetDigitalContentsByUserHandleSortEnum](enums/GetDigitalContentsByUserHandleSortEnum.md)
- [GetDigitalContentsByUserSortEnum](enums/GetDigitalContentsByUserSortEnum.md)
- [GetTipsCurrentUserFollowsEnum](enums/GetTipsCurrentUserFollowsEnum.md)
- [GetTipsUniqueByEnum](enums/GetTipsUniqueByEnum.md)
- [GetTrendingDigitalContentsTimeEnum](enums/GetTrendingDigitalContentsTimeEnum.md)
- [GetTrendingContentListsTimeEnum](enums/GetTrendingContentListsTimeEnum.md)

## Classes

- [DigitalContentsApi](classes/DigitalContentsApi.md)
- [Configuration](classes/Configuration.md)
- [ContentListsApi](classes/ContentListsApi.md)
- [ResolveApi](classes/ResolveApi.md)
- [TipsApi](classes/TipsApi.md)
- [UsersApi](classes/UsersApi.md)

## Interfaces

- [Activity](interfaces/Activity.md)
- [DigitalContent](interfaces/DigitalContent.md)
- [DigitalContentArtwork](interfaces/DigitalContentArtwork.md)
- [DigitalContentElement](interfaces/DigitalContentElement.md)
- [DigitalContentResponse](interfaces/DigitalContentResponse.md)
- [DigitalContentSearch](interfaces/DigitalContentSearch.md)
- [DigitalContentsResponse](interfaces/DigitalContentsResponse.md)
- [ConfigurationParameters](interfaces/ConfigurationParameters.md)
- [ConnectedWallets](interfaces/ConnectedWallets.md)
- [ConnectedWalletsResponse](interfaces/ConnectedWalletsResponse.md)
- [ContentList](interfaces/ContentList.md)
- [ContentListDigitalContentsResponse](interfaces/ContentListDigitalContentsResponse.md)
- [ContentListArtwork](interfaces/ContentListArtwork.md)
- [ContentListResponse](interfaces/ContentListResponse.md)
- [ContentListSearchResult](interfaces/ContentListSearchResult.md)
- [CoverPhoto](interfaces/CoverPhoto.md)
- [DecodedUserToken](interfaces/DecodedUserToken.md)
- [EncodedUserId](interfaces/EncodedUserId.md)
- [Favorite](interfaces/Favorite.md)
- [FavoritesResponse](interfaces/FavoritesResponse.md)
- [FollowersResponse](interfaces/FollowersResponse.md)
- [FollowingResponse](interfaces/FollowingResponse.md)
- [GetDigitalContentRequest](interfaces/GetDigitalContentRequest.md)
- [GetDigitalContentsByUserHandleRequest](interfaces/GetDigitalContentsByUserHandleRequest.md)
- [GetDigitalContentsByUserRequest](interfaces/GetDigitalContentsByUserRequest.md)
- [GetBulkDigitalContentsRequest](interfaces/GetBulkDigitalContentsRequest.md)
- [GetConnectedWalletsRequest](interfaces/GetConnectedWalletsRequest.md)
- [GetContentListDigitalContentsRequest](interfaces/GetContentListDigitalContentsRequest.md)
- [GetContentListRequest](interfaces/GetContentListRequest.md)
- [GetFavoritesRequest](interfaces/GetFavoritesRequest.md)
- [GetFollowersRequest](interfaces/GetFollowersRequest.md)
- [GetFollowingsRequest](interfaces/GetFollowingsRequest.md)
- [GetRelatedUsersRequest](interfaces/GetRelatedUsersRequest.md)
- [GetRepostsByHandleRequest](interfaces/GetRepostsByHandleRequest.md)
- [GetRepostsRequest](interfaces/GetRepostsRequest.md)
- [GetSupporter](interfaces/GetSupporter.md)
- [GetSupporterRequest](interfaces/GetSupporterRequest.md)
- [GetSupporters](interfaces/GetSupporters.md)
- [GetSupportersRequest](interfaces/GetSupportersRequest.md)
- [GetSupporting](interfaces/GetSupporting.md)
- [GetSupportingRequest](interfaces/GetSupportingRequest.md)
- [GetSupportingsRequest](interfaces/GetSupportingsRequest.md)
- [GetTipsRequest](interfaces/GetTipsRequest.md)
- [GetTipsResponse](interfaces/GetTipsResponse.md)
- [GetTopDigitalContentTagsRequest](interfaces/GetTopDigitalContentTagsRequest.md)
- [GetTopUsersInGenreRequest](interfaces/GetTopUsersInGenreRequest.md)
- [GetTopUsersRequest](interfaces/GetTopUsersRequest.md)
- [GetTrendingDigitalContentsRequest](interfaces/GetTrendingDigitalContentsRequest.md)
- [GetTrendingContentListsRequest](interfaces/GetTrendingContentListsRequest.md)
- [GetUserByHandleRequest](interfaces/GetUserByHandleRequest.md)
- [GetUserIDFromWalletRequest](interfaces/GetUserIDFromWalletRequest.md)
- [GetUserRequest](interfaces/GetUserRequest.md)
- [GetUsersDigitalContentHistoryRequest](interfaces/GetUsersDigitalContentHistoryRequest.md)
- [HistoryResponse](interfaces/HistoryResponse.md)
- [ProfilePicture](interfaces/ProfilePicture.md)
- [RelatedLandlordResponse](interfaces/RelatedLandlordResponse.md)
- [RemixParent](interfaces/RemixParent.md)
- [Reposts](interfaces/Reposts.md)
- [ResolveRequest](interfaces/ResolveRequest.md)
- [SearchDigitalContentsRequest](interfaces/SearchDigitalContentsRequest.md)
- [SearchContentListsRequest](interfaces/SearchContentListsRequest.md)
- [SearchUsersRequest](interfaces/SearchUsersRequest.md)
- [StreamDigitalContentRequest](interfaces/StreamDigitalContentRequest.md)
- [Supporter](interfaces/Supporter.md)
- [Supporting](interfaces/Supporting.md)
- [TagsResponse](interfaces/TagsResponse.md)
- [Tip](interfaces/Tip.md)
- [TopGenreUsersResponse](interfaces/TopGenreUsersResponse.md)
- [TopUsersResponse](interfaces/TopUsersResponse.md)
- [TrendingContentListsResponse](interfaces/TrendingContentListsResponse.md)
- [User](interfaces/User.md)
- [UserAssociatedWalletResponse](interfaces/UserAssociatedWalletResponse.md)
- [UserResponse](interfaces/UserResponse.md)
- [UserSearch](interfaces/UserSearch.md)
- [VerifyIDTokenRequest](interfaces/VerifyIDTokenRequest.md)
- [VerifyToken](interfaces/VerifyToken.md)
- [VersionMetadata](interfaces/VersionMetadata.md)

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
| `digitalContents` | [`DigitalContentsApi`](classes/DigitalContentsApi.md) |
| `contentLists` | [`ContentListsApi`](classes/ContentListsApi.md) |
| `full` | { `digitalContents`: [`DigitalContentsApi`](classes/full.DigitalContentsApi.md) ; `contentLists`: [`ContentListsApi`](classes/full.ContentListsApi.md) ; `reactions`: [`ReactionsApi`](classes/full.ReactionsApi.md) ; `search`: [`SearchApi`](classes/full.SearchApi.md) ; `tips`: [`TipsApi`](classes/full.TipsApi.md) ; `users`: [`UsersApi`](classes/full.UsersApi.md)  } |
| `full.digitalContents` | [`DigitalContentsApi`](classes/full.DigitalContentsApi.md) |
| `full.contentLists` | [`ContentListsApi`](classes/full.ContentListsApi.md) |
| `full.reactions` | [`ReactionsApi`](classes/full.ReactionsApi.md) |
| `full.search` | [`SearchApi`](classes/full.SearchApi.md) |
| `full.tips` | [`TipsApi`](classes/full.TipsApi.md) |
| `full.users` | [`UsersApi`](classes/full.UsersApi.md) |
| `oauth` | `undefined` \| `Oauth` |
| `resolve` | <T\>(`requestParameters`: [`ResolveRequest`](interfaces/ResolveRequest.md)) => `Promise`<`T`\> |
| `tips` | [`TipsApi`](classes/TipsApi.md) |
| `users` | [`UsersApi`](classes/UsersApi.md) |
