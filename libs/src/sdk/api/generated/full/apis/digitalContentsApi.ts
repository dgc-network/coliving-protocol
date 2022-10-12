// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import {
    FullDigitalContentResponse,
    FullDigitalContentResponseFromJSON,
    FullDigitalContentResponseToJSON,
    FullDigitalContentsResponse,
    FullDigitalContentsResponseFromJSON,
    FullDigitalContentsResponseToJSON,
    RemixesResponseFull,
    RemixesResponseFullFromJSON,
    RemixesResponseFullToJSON,
    RemixingResponse,
    RemixingResponseFromJSON,
    RemixingResponseToJSON,
    StemsResponse,
    StemsResponseFromJSON,
    StemsResponseToJSON,
    DigitalContentFavoritesResponseFull,
    DigitalContentFavoritesResponseFullFromJSON,
    DigitalContentFavoritesResponseFullToJSON,
    DigitalContentRepostsResponseFull,
    DigitalContentRepostsResponseFullFromJSON,
    DigitalContentRepostsResponseFullToJSON,
    TrendingIdsResponse,
    TrendingIdsResponseFromJSON,
    TrendingIdsResponseToJSON,
} from '../models';

export interface GetBulkDigitalContentsRequest {
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * The permalink of the digital_content(s)
     */
    permalink?: Array<string>;
    /**
     * The ID of the digital_content(s)
     */
    id?: Array<string>;
}

export interface GetMostLovedDigitalContentsRequest {
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Number of digitalContents to fetch
     */
    limit?: number;
    /**
     * Boolean to include user info with digitalContents
     */
    withUsers?: boolean;
}

export interface GetRecommendedDigitalContentsRequest {
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
    /**
     * Calculate trending over a specified time range
     */
    time?: GetRecommendedDigitalContentsTimeEnum;
    /**
     * List of digital_content ids to exclude
     */
    exclusionList?: Array<number>;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetRecommendedDigitalContentsWithVersionRequest {
    /**
     * The strategy version of trending to use
     */
    version: string;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
    /**
     * Calculate trending over a specified time range
     */
    time?: GetRecommendedDigitalContentsWithVersionTimeEnum;
    /**
     * List of digital_content ids to exclude
     */
    exclusionList?: Array<number>;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetRemixableDigitalContentsRequest {
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Boolean to include user info with digitalContents
     */
    withUsers?: boolean;
}

export interface GetDigitalContentRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * The User handle of the digital_content owner
     */
    handle?: string;
    /**
     * The URLized title of the digital_content
     */
    urlTitle?: string;
    /**
     * Whether or not to show unlisted digitalContents
     */
    showUnlisted?: boolean;
}

export interface GetDigitalContentRemixParentsRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetDigitalContentRemixesRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetDigitalContentStemsRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
}

export interface GetTrendingDigitalContentIDsRequest {
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
}

export interface GetTrendingDigitalContentsRequest {
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
    /**
     * Calculate trending over a specified time range
     */
    time?: GetTrendingDigitalContentsTimeEnum;
}

export interface GetTrendingDigitalContentsIDsWithVersionRequest {
    /**
     * The strategy version of trending to use
     */
    version: string;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
}

export interface GetTrendingDigitalContentsWithVersionRequest {
    /**
     * The strategy version of trending to use
     */
    version: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
    /**
     * Calculate trending over a specified time range
     */
    time?: GetTrendingDigitalContentsWithVersionTimeEnum;
}

export interface GetUnderTheRadarDigitalContentsRequest {
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Filters for activity that is original vs reposts
     */
    filter?: GetUnderTheRadarDigitalContentsFilterEnum;
    /**
     * Whether to only include digitalContents
     */
    digitalContentsOnly?: boolean;
    /**
     * Boolean to include user info with digitalContents
     */
    withUsers?: boolean;
}

export interface GetUndergroundTrendingDigitalContentsRequest {
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetUndergroundTrendingDigitalContentsWithVersionRequest {
    /**
     * The strategy version of trending to user
     */
    version: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetUsersFromFavoritesRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetUsersFromRepostsRequest {
    /**
     * A DigitalContent ID
     */
    digitalContentId: string;
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

/**
 * 
 */
export class DigitalContentsApi extends runtime.BaseAPI {

    /**
     * Gets the digitalContents found on the \"Best New Releases\" smart contentList
     */
    async bestNewReleases(): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/best_new_releases`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets a list of digitalContents using their IDs or permalinks
     */
    async getBulkDigitalContents(requestParameters: GetBulkDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.permalink) {
            queryParameters['permalink'] = requestParameters.permalink;
        }

        if (requestParameters.id) {
            queryParameters['id'] = requestParameters.id;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digitalContents`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentResponse["data"]>>;
    }

    /**
     * Gets the digitalContents found on the \"Most Loved\" smart contentList
     */
    async getMostLovedDigitalContents(requestParameters: GetMostLovedDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.withUsers !== undefined) {
            queryParameters['with_users'] = requestParameters.withUsers;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/most_loved`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Get recommended digitalContents
     */
    async getRecommendedDigitalContents(requestParameters: GetRecommendedDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        if (requestParameters.time !== undefined) {
            queryParameters['time'] = requestParameters.time;
        }

        if (requestParameters.exclusionList) {
            queryParameters['exclusion_list'] = requestParameters.exclusionList;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/recommended`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Get recommended digitalContents using the given trending strategy version
     */
    async getRecommendedDigitalContentsWithVersion(requestParameters: GetRecommendedDigitalContentsWithVersionRequest): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getRecommendedDigitalContentsWithVersion.');
        }

        const queryParameters: any = {};

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        if (requestParameters.time !== undefined) {
            queryParameters['time'] = requestParameters.time;
        }

        if (requestParameters.exclusionList) {
            queryParameters['exclusion_list'] = requestParameters.exclusionList;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/recommended/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets a list of digitalContents that have stems available for remixing
     */
    async getRemixableDigitalContents(requestParameters: GetRemixableDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.withUsers !== undefined) {
            queryParameters['with_users'] = requestParameters.withUsers;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/remixables`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentResponse["data"]>>;
    }

    /**
     * Gets a digital_content by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.
     */
    async getDigitalContent(requestParameters: GetDigitalContentRequest): Promise<NonNullable<FullDigitalContentResponse["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getDigitalContent.');
        }

        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.handle !== undefined) {
            queryParameters['handle'] = requestParameters.handle;
        }

        if (requestParameters.urlTitle !== undefined) {
            queryParameters['url_title'] = requestParameters.urlTitle;
        }

        if (requestParameters.showUnlisted !== undefined) {
            queryParameters['show_unlisted'] = requestParameters.showUnlisted;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentResponse["data"]>>;
    }

    /**
     * Gets all the digitalContents that the given digital_content remixes
     */
    async getDigitalContentRemixParents(requestParameters: GetDigitalContentRemixParentsRequest): Promise<NonNullable<RemixingResponse["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getDigitalContentRemixParents.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}/remixing`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<RemixingResponse["data"]>>;
    }

    /**
     * Get all digitalContents that remix the given digital_content
     */
    async getDigitalContentRemixes(requestParameters: GetDigitalContentRemixesRequest): Promise<NonNullable<RemixesResponseFull["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getDigitalContentRemixes.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}/remixes`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<RemixesResponseFull["data"]>>;
    }

    /**
     * Get the remixable stems of a digital_content
     */
    async getDigitalContentStems(requestParameters: GetDigitalContentStemsRequest): Promise<NonNullable<StemsResponse["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getDigitalContentStems.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}/stems`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<StemsResponse["data"]>>;
    }

    /**
     * Gets the digital_content IDs of the top trending digitalContents on Coliving
     */
    async getTrendingDigitalContentIDs(requestParameters: GetTrendingDigitalContentIDsRequest = {}): Promise<NonNullable<TrendingIdsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending/ids`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TrendingIdsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending (most popular) digitalContents on Coliving
     */
    async getTrendingDigitalContents(requestParameters: GetTrendingDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        if (requestParameters.time !== undefined) {
            queryParameters['time'] = requestParameters.time;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets the digital_content IDs of the top trending digitalContents on Coliving based on the given trending strategy version
     */
    async getTrendingDigitalContentsIDsWithVersion(requestParameters: GetTrendingDigitalContentsIDsWithVersionRequest): Promise<NonNullable<TrendingIdsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getTrendingDigitalContentsIDsWithVersion.');
        }

        const queryParameters: any = {};

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending/ids/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TrendingIdsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending (most popular digitalContents on Coliving using a given trending strategy version
     */
    async getTrendingDigitalContentsWithVersion(requestParameters: GetTrendingDigitalContentsWithVersionRequest): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getTrendingDigitalContentsWithVersion.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        if (requestParameters.time !== undefined) {
            queryParameters['time'] = requestParameters.time;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets the digitalContents found on the \"Under the Radar\" smart contentList
     */
    async getUnderTheRadarDigitalContents(requestParameters: GetUnderTheRadarDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        if (requestParameters.filter !== undefined) {
            queryParameters['filter'] = requestParameters.filter;
        }

        if (requestParameters.digitalContentsOnly !== undefined) {
            queryParameters['digitalContents_only'] = requestParameters.digitalContentsOnly;
        }

        if (requestParameters.withUsers !== undefined) {
            queryParameters['with_users'] = requestParameters.withUsers;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/under_the_radar`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending underground digitalContents on Coliving
     */
    async getUndergroundTrendingDigitalContents(requestParameters: GetUndergroundTrendingDigitalContentsRequest = {}): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending/underground`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending underground digitalContents on Coliving using a given trending strategy version
     */
    async getUndergroundTrendingDigitalContentsWithVersion(requestParameters: GetUndergroundTrendingDigitalContentsWithVersionRequest): Promise<NonNullable<FullDigitalContentsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getUndergroundTrendingDigitalContentsWithVersion.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/trending/underground/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullDigitalContentsResponse["data"]>>;
    }

    /**
     * Get users that favorited a digital_content
     */
    async getUsersFromFavorites(requestParameters: GetUsersFromFavoritesRequest): Promise<NonNullable<DigitalContentFavoritesResponseFull["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getUsersFromFavorites.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}/favorites`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<DigitalContentFavoritesResponseFull["data"]>>;
    }

    /**
     * Get the users that reposted a digital_content
     */
    async getUsersFromReposts(requestParameters: GetUsersFromRepostsRequest): Promise<NonNullable<DigitalContentRepostsResponseFull["data"]>> {
        if (requestParameters.digitalContentId === null || requestParameters.digitalContentId === undefined) {
            throw new runtime.RequiredError('digitalContentId','Required parameter requestParameters.digitalContentId was null or undefined when calling getUsersFromReposts.');
        }

        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/digital_contents/{digital_content_id}/reposts`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.digitalContentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<DigitalContentRepostsResponseFull["data"]>>;
    }

}

/**
    * @export
    * @enum {string}
    */
export enum GetRecommendedDigitalContentsTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetRecommendedDigitalContentsWithVersionTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetTrendingDigitalContentsTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetTrendingDigitalContentsWithVersionTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetUnderTheRadarDigitalContentsFilterEnum {
    All = 'all',
    Repost = 'repost',
    Original = 'original'
}