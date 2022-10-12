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
    FullAgreementResponse,
    FullAgreementResponseFromJSON,
    FullAgreementResponseToJSON,
    FullAgreementsResponse,
    FullAgreementsResponseFromJSON,
    FullAgreementsResponseToJSON,
    RemixesResponseFull,
    RemixesResponseFullFromJSON,
    RemixesResponseFullToJSON,
    RemixingResponse,
    RemixingResponseFromJSON,
    RemixingResponseToJSON,
    StemsResponse,
    StemsResponseFromJSON,
    StemsResponseToJSON,
    AgreementFavoritesResponseFull,
    AgreementFavoritesResponseFullFromJSON,
    AgreementFavoritesResponseFullToJSON,
    AgreementRepostsResponseFull,
    AgreementRepostsResponseFullFromJSON,
    AgreementRepostsResponseFullToJSON,
    TrendingIdsResponse,
    TrendingIdsResponseFromJSON,
    TrendingIdsResponseToJSON,
} from '../models';

export interface GetBulkAgreementsRequest {
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

export interface GetMostLovedAgreementsRequest {
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Number of agreements to fetch
     */
    limit?: number;
    /**
     * Boolean to include user info with agreements
     */
    withUsers?: boolean;
}

export interface GetRecommendedAgreementsRequest {
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
    time?: GetRecommendedAgreementsTimeEnum;
    /**
     * List of digital_content ids to exclude
     */
    exclusionList?: Array<number>;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetRecommendedAgreementsWithVersionRequest {
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
    time?: GetRecommendedAgreementsWithVersionTimeEnum;
    /**
     * List of digital_content ids to exclude
     */
    exclusionList?: Array<number>;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetRemixableAgreementsRequest {
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
    /**
     * Boolean to include user info with agreements
     */
    withUsers?: boolean;
}

export interface GetAgreementRequest {
    /**
     * A DigitalContent ID
     */
    agreementId: string;
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
     * Whether or not to show unlisted agreements
     */
    showUnlisted?: boolean;
}

export interface GetAgreementRemixParentsRequest {
    /**
     * A DigitalContent ID
     */
    agreementId: string;
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

export interface GetAgreementRemixesRequest {
    /**
     * A DigitalContent ID
     */
    agreementId: string;
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

export interface GetAgreementStemsRequest {
    /**
     * A DigitalContent ID
     */
    agreementId: string;
}

export interface GetTrendingAgreementIDsRequest {
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
}

export interface GetTrendingAgreementsRequest {
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
    time?: GetTrendingAgreementsTimeEnum;
}

export interface GetTrendingAgreementsIDsWithVersionRequest {
    /**
     * The strategy version of trending to use
     */
    version: string;
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
}

export interface GetTrendingAgreementsWithVersionRequest {
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
    time?: GetTrendingAgreementsWithVersionTimeEnum;
}

export interface GetUnderTheRadarAgreementsRequest {
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
    filter?: GetUnderTheRadarAgreementsFilterEnum;
    /**
     * Whether to only include agreements
     */
    agreementsOnly?: boolean;
    /**
     * Boolean to include user info with agreements
     */
    withUsers?: boolean;
}

export interface GetUndergroundTrendingAgreementsRequest {
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

export interface GetUndergroundTrendingAgreementsWithVersionRequest {
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
    agreementId: string;
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
    agreementId: string;
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
export class AgreementsApi extends runtime.BaseAPI {

    /**
     * Gets the agreements found on the \"Best New Releases\" smart contentList
     */
    async bestNewReleases(): Promise<NonNullable<FullAgreementsResponse["data"]>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/best_new_releases`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets a list of agreements using their IDs or permalinks
     */
    async getBulkAgreements(requestParameters: GetBulkAgreementsRequest = {}): Promise<NonNullable<FullAgreementResponse["data"]>> {
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
            path: `/agreements`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementResponse["data"]>>;
    }

    /**
     * Gets the agreements found on the \"Most Loved\" smart contentList
     */
    async getMostLovedAgreements(requestParameters: GetMostLovedAgreementsRequest = {}): Promise<NonNullable<FullAgreementsResponse["data"]>> {
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
            path: `/agreements/most_loved`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Get recommended agreements
     */
    async getRecommendedAgreements(requestParameters: GetRecommendedAgreementsRequest = {}): Promise<NonNullable<FullAgreementsResponse["data"]>> {
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
            path: `/agreements/recommended`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Get recommended agreements using the given trending strategy version
     */
    async getRecommendedAgreementsWithVersion(requestParameters: GetRecommendedAgreementsWithVersionRequest): Promise<NonNullable<FullAgreementsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getRecommendedAgreementsWithVersion.');
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
            path: `/agreements/recommended/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets a list of agreements that have stems available for remixing
     */
    async getRemixableAgreements(requestParameters: GetRemixableAgreementsRequest = {}): Promise<NonNullable<FullAgreementResponse["data"]>> {
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
            path: `/agreements/remixables`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementResponse["data"]>>;
    }

    /**
     * Gets a digital_content by ID. If `show_unlisted` is true, then `handle` and `url_title` are required.
     */
    async getAgreement(requestParameters: GetAgreementRequest): Promise<NonNullable<FullAgreementResponse["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getAgreement.');
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
            path: `/agreements/{digital_content_id}`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementResponse["data"]>>;
    }

    /**
     * Gets all the agreements that the given digital_content remixes
     */
    async getAgreementRemixParents(requestParameters: GetAgreementRemixParentsRequest): Promise<NonNullable<RemixingResponse["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getAgreementRemixParents.');
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
            path: `/agreements/{digital_content_id}/remixing`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<RemixingResponse["data"]>>;
    }

    /**
     * Get all agreements that remix the given digital_content
     */
    async getAgreementRemixes(requestParameters: GetAgreementRemixesRequest): Promise<NonNullable<RemixesResponseFull["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getAgreementRemixes.');
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
            path: `/agreements/{digital_content_id}/remixes`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<RemixesResponseFull["data"]>>;
    }

    /**
     * Get the remixable stems of a digital_content
     */
    async getAgreementStems(requestParameters: GetAgreementStemsRequest): Promise<NonNullable<StemsResponse["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getAgreementStems.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/{digital_content_id}/stems`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<StemsResponse["data"]>>;
    }

    /**
     * Gets the digital_content IDs of the top trending agreements on Coliving
     */
    async getTrendingAgreementIDs(requestParameters: GetTrendingAgreementIDsRequest = {}): Promise<NonNullable<TrendingIdsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/trending/ids`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TrendingIdsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending (most popular) agreements on Coliving
     */
    async getTrendingAgreements(requestParameters: GetTrendingAgreementsRequest = {}): Promise<NonNullable<FullAgreementsResponse["data"]>> {
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
            path: `/agreements/trending`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets the digital_content IDs of the top trending agreements on Coliving based on the given trending strategy version
     */
    async getTrendingAgreementsIDsWithVersion(requestParameters: GetTrendingAgreementsIDsWithVersionRequest): Promise<NonNullable<TrendingIdsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getTrendingAgreementsIDsWithVersion.');
        }

        const queryParameters: any = {};

        if (requestParameters.genre !== undefined) {
            queryParameters['genre'] = requestParameters.genre;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/trending/ids/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TrendingIdsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending (most popular agreements on Coliving using a given trending strategy version
     */
    async getTrendingAgreementsWithVersion(requestParameters: GetTrendingAgreementsWithVersionRequest): Promise<NonNullable<FullAgreementsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getTrendingAgreementsWithVersion.');
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
            path: `/agreements/trending/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets the agreements found on the \"Under the Radar\" smart contentList
     */
    async getUnderTheRadarAgreements(requestParameters: GetUnderTheRadarAgreementsRequest = {}): Promise<NonNullable<FullAgreementsResponse["data"]>> {
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

        if (requestParameters.agreementsOnly !== undefined) {
            queryParameters['agreements_only'] = requestParameters.agreementsOnly;
        }

        if (requestParameters.withUsers !== undefined) {
            queryParameters['with_users'] = requestParameters.withUsers;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/under_the_radar`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending underground agreements on Coliving
     */
    async getUndergroundTrendingAgreements(requestParameters: GetUndergroundTrendingAgreementsRequest = {}): Promise<NonNullable<FullAgreementsResponse["data"]>> {
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
            path: `/agreements/trending/underground`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending underground agreements on Coliving using a given trending strategy version
     */
    async getUndergroundTrendingAgreementsWithVersion(requestParameters: GetUndergroundTrendingAgreementsWithVersionRequest): Promise<NonNullable<FullAgreementsResponse["data"]>> {
        if (requestParameters.version === null || requestParameters.version === undefined) {
            throw new runtime.RequiredError('version','Required parameter requestParameters.version was null or undefined when calling getUndergroundTrendingAgreementsWithVersion.');
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
            path: `/agreements/trending/underground/{version}`.replace(`{${"version"}}`, encodeURIComponent(String(requestParameters.version))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreementsResponse["data"]>>;
    }

    /**
     * Get users that favorited a digital_content
     */
    async getUsersFromFavorites(requestParameters: GetUsersFromFavoritesRequest): Promise<NonNullable<AgreementFavoritesResponseFull["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getUsersFromFavorites.');
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
            path: `/agreements/{digital_content_id}/favorites`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<AgreementFavoritesResponseFull["data"]>>;
    }

    /**
     * Get the users that reposted a digital_content
     */
    async getUsersFromReposts(requestParameters: GetUsersFromRepostsRequest): Promise<NonNullable<AgreementRepostsResponseFull["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getUsersFromReposts.');
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
            path: `/agreements/{digital_content_id}/reposts`.replace(`{${"digital_content_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<AgreementRepostsResponseFull["data"]>>;
    }

}

/**
    * @export
    * @enum {string}
    */
export enum GetRecommendedAgreementsTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetRecommendedAgreementsWithVersionTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetTrendingAgreementsTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetTrendingAgreementsWithVersionTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}
/**
    * @export
    * @enum {string}
    */
export enum GetUnderTheRadarAgreementsFilterEnum {
    All = 'all',
    Repost = 'repost',
    Original = 'original'
}
