---
id: "full.DigitalContentsApi"
title: "DigitalContents"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### bestNewReleases

**bestNewReleases**(): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the digitalContents found on the \"Best New Releases\" smart contentList

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getBulkDigitalContents

**getBulkDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

Gets a list of digitalContents using their IDs or permalinks

Example:

```typescript

const digitalContents = await colivingSdk.digitalContents.getBulkDigitalContents();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkDigitalContentsRequest`](../interfaces/full.GetBulkDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

___

### getMostLovedDigitalContents

**getMostLovedDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the digitalContents found on the \"Most Loved\" smart contentList

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetMostLovedDigitalContentsRequest`](../interfaces/full.GetMostLovedDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getRecommendedDigitalContents

**getRecommendedDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Get recommended digitalContents

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRecommendedDigitalContentsRequest`](../interfaces/full.GetRecommendedDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getRecommendedDigitalContentsWithVersion

**getRecommendedDigitalContentsWithVersion**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Get recommended digitalContents using the given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRecommendedDigitalContentsWithVersionRequest`](../interfaces/full.GetRecommendedDigitalContentsWithVersionRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getRemixableDigitalContents

**getRemixableDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

Gets a list of digitalContents that have stems available for remixing

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRemixableDigitalContentsRequest`](../interfaces/full.GetRemixableDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

___

### getDigitalContent

**getDigitalContent**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

Gets a digital_content by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.

Example:

```typescript

const digital_content = await colivingSdk.digitalContents.getDigitalContent({
    digitalContentId: "D7KyD",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentRequest`](../interfaces/full.GetDigitalContentRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)\>

___

### getDigitalContentRemixParents

**getDigitalContentRemixParents**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets all the digitalContents that the given digital_content remixes

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentRemixParentsRequest`](../interfaces/full.GetDigitalContentRemixParentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getDigitalContentRemixes

**getDigitalContentRemixes**(`requestParameters`): `Promise`<[`RemixesResponse`](../interfaces/full.RemixesResponse.md)\>

Get all digitalContents that remix the given digital_content

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentRemixesRequest`](../interfaces/full.GetDigitalContentRemixesRequest.md) |

#### Returns

`Promise`<[`RemixesResponse`](../interfaces/full.RemixesResponse.md)\>

___

### getDigitalContentStems

**getDigitalContentStems**(`requestParameters`): `Promise`<[`StemFull`](../interfaces/full.StemFull.md)[]\>

Get the remixable stems of a digital_content

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetDigitalContentStemsRequest`](../interfaces/full.GetDigitalContentStemsRequest.md) |

#### Returns

`Promise`<[`StemFull`](../interfaces/full.StemFull.md)[]\>

___

### getTrendingDigitalContentIDs

**getTrendingDigitalContentIDs**(`requestParameters?`): `Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

Gets the digital_content IDs of the top trending digitalContents on Coliving

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingDigitalContentIDsRequest`](../interfaces/full.GetTrendingDigitalContentIDsRequest.md) |

#### Returns

`Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

___

### getTrendingDigitalContents

**getTrendingDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the top 100 trending (most popular) digitalContents on Coliving

Example:

```typescript

const digitalContents = await colivingSdk.digitalContents.getTrendingDigitalContents();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingDigitalContentsRequest`](../interfaces/full.GetTrendingDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getTrendingDigitalContentsIDsWithVersion

**getTrendingDigitalContentsIDsWithVersion**(`requestParameters`): `Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

Gets the digital_content IDs of the top trending digitalContents on Coliving based on the given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingDigitalContentsIDsWithVersionRequest`](../interfaces/full.GetTrendingDigitalContentsIDsWithVersionRequest.md) |

#### Returns

`Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

___

### getTrendingDigitalContentsWithVersion

**getTrendingDigitalContentsWithVersion**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the top 100 trending (most popular digitalContents on Coliving using a given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingDigitalContentsWithVersionRequest`](../interfaces/full.GetTrendingDigitalContentsWithVersionRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getUnderTheRadarDigitalContents

**getUnderTheRadarDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the digitalContents found on the \"Under the Radar\" smart contentList

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUnderTheRadarDigitalContentsRequest`](../interfaces/full.GetUnderTheRadarDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getUndergroundTrendingDigitalContents

**getUndergroundTrendingDigitalContents**(`requestParameters?`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the top 100 trending underground digitalContents on Coliving

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUndergroundTrendingDigitalContentsRequest`](../interfaces/full.GetUndergroundTrendingDigitalContentsRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getUndergroundTrendingDigitalContentsWithVersion

**getUndergroundTrendingDigitalContentsWithVersion**(`requestParameters`): `Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

Gets the top 100 trending underground digitalContents on Coliving using a given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUndergroundTrendingDigitalContentsWithVersionRequest`](../interfaces/full.GetUndergroundTrendingDigitalContentsWithVersionRequest.md) |

#### Returns

`Promise`<[`DigitalContentFull`](../interfaces/full.DigitalContentFull.md)[]\>

___

### getUsersFromFavorites

**getUsersFromFavorites**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that favorited a digital_content

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromFavoritesRequest`](../interfaces/full.GetUsersFromFavoritesRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUsersFromReposts

**getUsersFromReposts**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get the users that reposted a digital_content

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromRepostsRequest`](../interfaces/full.GetUsersFromRepostsRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>
