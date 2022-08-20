---
id: "full.AgreementsApi"
title: "Agreements"
sidebar_position: 0
custom_edit_url: null
pagination_prev: null
pagination_next: null
---

## Methods

### bestNewReleases

**bestNewReleases**(): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the agreements found on the \"Best New Releases\" smart content list

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getBulkAgreements

**getBulkAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

Gets a list of agreements using their IDs or permalinks

Example:

```typescript

const agreements = await colivingSdk.agreements.getBulkAgreements();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetBulkAgreementsRequest`](../interfaces/full.GetBulkAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

___

### getMostLovedAgreements

**getMostLovedAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the agreements found on the \"Most Loved\" smart content list

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetMostLovedAgreementsRequest`](../interfaces/full.GetMostLovedAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getRecommendedAgreements

**getRecommendedAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Get recommended agreements

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRecommendedAgreementsRequest`](../interfaces/full.GetRecommendedAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getRecommendedAgreementsWithVersion

**getRecommendedAgreementsWithVersion**(`requestParameters`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Get recommended agreements using the given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRecommendedAgreementsWithVersionRequest`](../interfaces/full.GetRecommendedAgreementsWithVersionRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getRemixableAgreements

**getRemixableAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

Gets a list of agreements that have stems available for remixing

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetRemixableAgreementsRequest`](../interfaces/full.GetRemixableAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

___

### getAgreement

**getAgreement**(`requestParameters`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

Gets a agreement by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.

Example:

```typescript

const agreement = await colivingSdk.agreements.getAgreement({
    agreementId: "D7KyD",
});

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRequest`](../interfaces/full.GetAgreementRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)\>

___

### getAgreementRemixParents

**getAgreementRemixParents**(`requestParameters`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets all the agreements that the given agreement remixes

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRemixParentsRequest`](../interfaces/full.GetAgreementRemixParentsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getAgreementRemixes

**getAgreementRemixes**(`requestParameters`): `Promise`<[`RemixesResponse`](../interfaces/full.RemixesResponse.md)\>

Get all agreements that remix the given agreement

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementRemixesRequest`](../interfaces/full.GetAgreementRemixesRequest.md) |

#### Returns

`Promise`<[`RemixesResponse`](../interfaces/full.RemixesResponse.md)\>

___

### getAgreementStems

**getAgreementStems**(`requestParameters`): `Promise`<[`StemFull`](../interfaces/full.StemFull.md)[]\>

Get the remixable stems of a agreement

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetAgreementStemsRequest`](../interfaces/full.GetAgreementStemsRequest.md) |

#### Returns

`Promise`<[`StemFull`](../interfaces/full.StemFull.md)[]\>

___

### getTrendingAgreementIDs

**getTrendingAgreementIDs**(`requestParameters?`): `Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

Gets the agreement IDs of the top trending agreements on Coliving

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingAgreementIDsRequest`](../interfaces/full.GetTrendingAgreementIDsRequest.md) |

#### Returns

`Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

___

### getTrendingAgreements

**getTrendingAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the top 100 trending (most popular) agreements on Coliving

Example:

```typescript

const agreements = await colivingSdk.agreements.getTrendingAgreements();

```

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingAgreementsRequest`](../interfaces/full.GetTrendingAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getTrendingAgreementsIDsWithVersion

**getTrendingAgreementsIDsWithVersion**(`requestParameters`): `Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

Gets the agreement IDs of the top trending agreements on Coliving based on the given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingAgreementsIDsWithVersionRequest`](../interfaces/full.GetTrendingAgreementsIDsWithVersionRequest.md) |

#### Returns

`Promise`<[`TrendingTimesIds`](../interfaces/full.TrendingTimesIds.md)\>

___

### getTrendingAgreementsWithVersion

**getTrendingAgreementsWithVersion**(`requestParameters`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the top 100 trending (most popular agreements on Coliving using a given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetTrendingAgreementsWithVersionRequest`](../interfaces/full.GetTrendingAgreementsWithVersionRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getUnderTheRadarAgreements

**getUnderTheRadarAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the agreements found on the \"Under the Radar\" smart content list

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUnderTheRadarAgreementsRequest`](../interfaces/full.GetUnderTheRadarAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getUndergroundTrendingAgreements

**getUndergroundTrendingAgreements**(`requestParameters?`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the top 100 trending underground agreements on Coliving

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUndergroundTrendingAgreementsRequest`](../interfaces/full.GetUndergroundTrendingAgreementsRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getUndergroundTrendingAgreementsWithVersion

**getUndergroundTrendingAgreementsWithVersion**(`requestParameters`): `Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

Gets the top 100 trending underground agreements on Coliving using a given trending strategy version

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUndergroundTrendingAgreementsWithVersionRequest`](../interfaces/full.GetUndergroundTrendingAgreementsWithVersionRequest.md) |

#### Returns

`Promise`<[`AgreementFull`](../interfaces/full.AgreementFull.md)[]\>

___

### getUsersFromFavorites

**getUsersFromFavorites**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get users that favorited a agreement

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromFavoritesRequest`](../interfaces/full.GetUsersFromFavoritesRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

___

### getUsersFromReposts

**getUsersFromReposts**(`requestParameters`): `Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>

Get the users that reposted a agreement

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestParameters` | [`GetUsersFromRepostsRequest`](../interfaces/full.GetUsersFromRepostsRequest.md) |

#### Returns

`Promise`<[`UserFull`](../interfaces/full.UserFull.md)[]\>
