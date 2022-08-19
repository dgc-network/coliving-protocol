---
id: "modules"
title: "@/sdk"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

## Namespaces

- [full](namespaces/full.md)

## Enumerations

- [GetTipsCurrentUserFollowsEnum](enums/GetTipsCurrentUserFollowsEnum.md)
- [GetTipsUniqueByEnum](enums/GetTipsUniqueByEnum.md)
- [GetAgreementsByUserSortEnum](enums/GetAgreementsByUserSortEnum.md)
- [GetTrendingPlaylistsTimeEnum](enums/GetTrendingPlaylistsTimeEnum.md)
- [GetTrendingAgreementsTimeEnum](enums/GetTrendingAgreementsTimeEnum.md)

## Classes

- [Configuration](classes/Configuration.md)
- [Playlists](classes/PlaylistsApi.md)
- [Resolve](classes/ResolveApi.md)
- [Tips](classes/TipsApi.md)
- [Agreements](classes/AgreementsApi.md)
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
- [GetBulkAgreementsRequest](interfaces/GetBulkAgreementsRequest.md)
- [GetConnectedWalletsRequest](interfaces/GetConnectedWalletsRequest.md)
- [GetFavoritesRequest](interfaces/GetFavoritesRequest.md)
- [GetPlaylistRequest](interfaces/GetPlaylistRequest.md)
- [GetPlaylistAgreementsRequest](interfaces/GetPlaylistAgreementsRequest.md)
- [GetRepostsRequest](interfaces/GetRepostsRequest.md)
- [GetSupporters](interfaces/GetSupporters.md)
- [GetSupportersRequest](interfaces/GetSupportersRequest.md)
- [GetSupporting](interfaces/GetSupporting.md)
- [GetSupportingsRequest](interfaces/GetSupportingsRequest.md)
- [GetTipsRequest](interfaces/GetTipsRequest.md)
- [GetTipsResponse](interfaces/GetTipsResponse.md)
- [GetTopAgreementTagsRequest](interfaces/GetTopAgreementTagsRequest.md)
- [GetAgreementRequest](interfaces/GetAgreementRequest.md)
- [GetAgreementsByUserRequest](interfaces/GetAgreementsByUserRequest.md)
- [GetTrendingPlaylistsRequest](interfaces/GetTrendingPlaylistsRequest.md)
- [GetTrendingAgreementsRequest](interfaces/GetTrendingAgreementsRequest.md)
- [GetUserIDFromWalletRequest](interfaces/GetUserIDFromWalletRequest.md)
- [GetUserRequest](interfaces/GetUserRequest.md)
- [Playlist](interfaces/Playlist.md)
- [PlaylistArtwork](interfaces/PlaylistArtwork.md)
- [PlaylistResponse](interfaces/PlaylistResponse.md)
- [PlaylistSearchResult](interfaces/PlaylistSearchResult.md)
- [PlaylistAgreementsResponse](interfaces/PlaylistAgreementsResponse.md)
- [ProfilePicture](interfaces/ProfilePicture.md)
- [RemixParent](interfaces/RemixParent.md)
- [Reposts](interfaces/Reposts.md)
- [ResolveRequest](interfaces/ResolveRequest.md)
- [SearchPlaylistsRequest](interfaces/SearchPlaylistsRequest.md)
- [SearchAgreementsRequest](interfaces/SearchAgreementsRequest.md)
- [SearchUsersRequest](interfaces/SearchUsersRequest.md)
- [StreamAgreementRequest](interfaces/StreamAgreementRequest.md)
- [Supporter](interfaces/Supporter.md)
- [Supporting](interfaces/Supporting.md)
- [TagsResponse](interfaces/TagsResponse.md)
- [Tip](interfaces/Tip.md)
- [Agreement](interfaces/Agreement.md)
- [AgreementArtwork](interfaces/AgreementArtwork.md)
- [AgreementElement](interfaces/AgreementElement.md)
- [AgreementResponse](interfaces/AgreementResponse.md)
- [AgreementSearch](interfaces/AgreementSearch.md)
- [AgreementsResponse](interfaces/AgreementsResponse.md)
- [TrendingPlaylistsResponse](interfaces/TrendingPlaylistsResponse.md)
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
| `full` | { `playlists`: [`Playlists`](classes/full.PlaylistsApi.md) ; `reactions`: [`Reactions`](classes/full.ReactionsApi.md) ; `search`: [`Search`](classes/full.SearchApi.md) ; `tips`: [`Tips`](classes/full.TipsApi.md) ; `agreements`: [`Agreements`](classes/full.AgreementsApi.md) ; `users`: [`Users`](classes/full.UsersApi.md)  } |
| `full.playlists` | [`Playlists`](classes/full.PlaylistsApi.md) |
| `full.reactions` | [`Reactions`](classes/full.ReactionsApi.md) |
| `full.search` | [`Search`](classes/full.SearchApi.md) |
| `full.tips` | [`Tips`](classes/full.TipsApi.md) |
| `full.agreements` | [`Agreements`](classes/full.AgreementsApi.md) |
| `full.users` | [`Users`](classes/full.UsersApi.md) |
| `oauth` | `undefined` \| `Oauth` |
| `playlists` | [`Playlists`](classes/PlaylistsApi.md) |
| `resolve` | <T\>(`requestParameters`: [`ResolveRequest`](interfaces/ResolveRequest.md)) => `Promise`<`T`\> |
| `tips` | [`Tips`](classes/TipsApi.md) |
| `agreements` | [`Agreements`](classes/AgreementsApi.md) |
| `users` | [`Users`](classes/UsersApi.md) |
