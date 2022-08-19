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
    FavoritesResponseFull,
    FavoritesResponseFullFromJSON,
    FavoritesResponseFullToJSON,
    FollowingResponseFull,
    FollowingResponseFullFromJSON,
    FollowingResponseFullToJSON,
    FullFollowersResponse,
    FullFollowersResponseFromJSON,
    FullFollowersResponseToJSON,
    FullGetSupporter,
    FullGetSupporterFromJSON,
    FullGetSupporterToJSON,
    FullGetSupporters,
    FullGetSupportersFromJSON,
    FullGetSupportersToJSON,
    FullGetSupporting,
    FullGetSupportingFromJSON,
    FullGetSupportingToJSON,
    FullReposts,
    FullRepostsFromJSON,
    FullRepostsToJSON,
    FullAgreements,
    FullAgreementsFromJSON,
    FullAgreementsToJSON,
    FullUserResponse,
    FullUserResponseFromJSON,
    FullUserResponseToJSON,
    HistoryResponseFull,
    HistoryResponseFullFromJSON,
    HistoryResponseFullToJSON,
    RelatedArtistResponseFull,
    RelatedArtistResponseFullFromJSON,
    RelatedArtistResponseFullToJSON,
    TopGenreUsersResponseFull,
    TopGenreUsersResponseFullFromJSON,
    TopGenreUsersResponseFullToJSON,
    TopUsersResponseFull,
    TopUsersResponseFullFromJSON,
    TopUsersResponseFullToJSON,
} from '../models';

export interface GetFavoritesRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetFollowersRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetFollowingsRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetRelatedUsersRequest {
    /**
     * A User ID
     */
    id: string;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetRepostsRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetRepostsByHandleRequest {
    /**
     * A User handle
     */
    handle: string;
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

export interface GetSupporterRequest {
    /**
     * A User ID
     */
    id: string;
    /**
     * A User ID of a supporter
     */
    supporterUserId: string;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetSupportersRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetSupportingRequest {
    /**
     * A User ID
     */
    id: string;
    /**
     * A User ID of a supported user
     */
    supportedUserId: string;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetSupportingsRequest {
    /**
     * A User ID
     */
    id: string;
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

export interface GetTopUsersRequest {
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

export interface GetTopUsersInGenreRequest {
    /**
     * The number of items to skip. Useful for pagination (page number * limit)
     */
    offset?: number;
    /**
     * The number of items to fetch
     */
    limit?: number;
    /**
     * List of Genres
     */
    genre?: Array<string>;
}

export interface GetAgreementsByUserRequest {
    /**
     * A User ID
     */
    id: string;
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
     * Field to sort by
     */
    sort?: GetAgreementsByUserSortEnum;
}

export interface GetAgreementsByUserHandleRequest {
    /**
     * A User handle
     */
    handle: string;
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
     * Field to sort by
     */
    sort?: GetAgreementsByUserHandleSortEnum;
}

export interface GetUserRequest {
    /**
     * A User ID
     */
    id: string;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetUserByHandleRequest {
    /**
     * A User handle
     */
    handle: string;
    /**
     * The user ID of the user making the request
     */
    userId?: string;
}

export interface GetUsersAgreementHistoryRequest {
    /**
     * A User ID
     */
    id: string;
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
export class UsersApi extends runtime.BaseAPI {

    /**
     * Gets a user\'s favorite agreements
     */
    async getFavorites(requestParameters: GetFavoritesRequest): Promise<NonNullable<FavoritesResponseFull["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getFavorites.');
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
            path: `/users/{id}/favorites/agreements`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FavoritesResponseFull["data"]>>;
    }

    /**
     * All users that follow the provided user
     */
    async getFollowers(requestParameters: GetFollowersRequest): Promise<NonNullable<FullFollowersResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getFollowers.');
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
            path: `/users/{id}/followers`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullFollowersResponse["data"]>>;
    }

    /**
     * All users that the provided user follows
     */
    async getFollowings(requestParameters: GetFollowingsRequest): Promise<NonNullable<FollowingResponseFull["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getFollowings.');
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
            path: `/users/{id}/following`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FollowingResponseFull["data"]>>;
    }

    /**
     * Gets a list of users that might be of interest to followers of this user.
     */
    async getRelatedUsers(requestParameters: GetRelatedUsersRequest): Promise<NonNullable<RelatedArtistResponseFull["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getRelatedUsers.');
        }

        const queryParameters: any = {};

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/related`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<RelatedArtistResponseFull["data"]>>;
    }

    /**
     * Gets the given user\'s reposts
     */
    async getReposts(requestParameters: GetRepostsRequest): Promise<NonNullable<FullReposts["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getReposts.');
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
            path: `/users/{id}/reposts`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullReposts["data"]>>;
    }

    /**
     * Gets the user\'s reposts by the user handle
     */
    async getRepostsByHandle(requestParameters: GetRepostsByHandleRequest): Promise<NonNullable<FullReposts["data"]>> {
        if (requestParameters.handle === null || requestParameters.handle === undefined) {
            throw new runtime.RequiredError('handle','Required parameter requestParameters.handle was null or undefined when calling getRepostsByHandle.');
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
            path: `/users/handle/{handle}/reposts`.replace(`{${"handle"}}`, encodeURIComponent(String(requestParameters.handle))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullReposts["data"]>>;
    }

    /**
     * Gets the specified supporter of the given user
     */
    async getSupporter(requestParameters: GetSupporterRequest): Promise<NonNullable<FullGetSupporter["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getSupporter.');
        }

        if (requestParameters.supporterUserId === null || requestParameters.supporterUserId === undefined) {
            throw new runtime.RequiredError('supporterUserId','Required parameter requestParameters.supporterUserId was null or undefined when calling getSupporter.');
        }

        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/supporters/{supporter_user_id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))).replace(`{${"supporter_user_id"}}`, encodeURIComponent(String(requestParameters.supporterUserId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullGetSupporter["data"]>>;
    }

    /**
     * Gets the supporters of the given user
     */
    async getSupporters(requestParameters: GetSupportersRequest): Promise<NonNullable<FullGetSupporters["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getSupporters.');
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
            path: `/users/{id}/supporters`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullGetSupporters["data"]>>;
    }

    /**
     * Gets the support from the given user to the supported user
     */
    async getSupporting(requestParameters: GetSupportingRequest): Promise<NonNullable<FullGetSupporting["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getSupporting.');
        }

        if (requestParameters.supportedUserId === null || requestParameters.supportedUserId === undefined) {
            throw new runtime.RequiredError('supportedUserId','Required parameter requestParameters.supportedUserId was null or undefined when calling getSupporting.');
        }

        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/supporting/{supported_user_id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))).replace(`{${"supported_user_id"}}`, encodeURIComponent(String(requestParameters.supportedUserId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullGetSupporting["data"]>>;
    }

    /**
     * Gets the users that the given user supports
     */
    async getSupportings(requestParameters: GetSupportingsRequest): Promise<NonNullable<FullGetSupporting["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getSupportings.');
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
            path: `/users/{id}/supporting`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullGetSupporting["data"]>>;
    }

    /**
     * Get the Top Users having at least one agreement by follower count
     */
    async getTopUsers(requestParameters: GetTopUsersRequest = {}): Promise<NonNullable<TopUsersResponseFull["data"]>> {
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
            path: `/users/top`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TopUsersResponseFull["data"]>>;
    }

    /**
     * Get the Top Users for a Given Genre
     */
    async getTopUsersInGenre(requestParameters: GetTopUsersInGenreRequest = {}): Promise<NonNullable<TopGenreUsersResponseFull["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.offset !== undefined) {
            queryParameters['offset'] = requestParameters.offset;
        }

        if (requestParameters.limit !== undefined) {
            queryParameters['limit'] = requestParameters.limit;
        }

        if (requestParameters.genre) {
            queryParameters['genre'] = requestParameters.genre;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/genre/top`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TopGenreUsersResponseFull["data"]>>;
    }

    /**
     * Gets the agreements created by a user using their user ID
     */
    async getAgreementsByUser(requestParameters: GetAgreementsByUserRequest): Promise<NonNullable<FullAgreements["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getAgreementsByUser.');
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

        if (requestParameters.sort !== undefined) {
            queryParameters['sort'] = requestParameters.sort;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/agreements`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreements["data"]>>;
    }

    /**
     * Gets the agreements created by a user using the user\'s handle
     */
    async getAgreementsByUserHandle(requestParameters: GetAgreementsByUserHandleRequest): Promise<NonNullable<FullAgreements["data"]>> {
        if (requestParameters.handle === null || requestParameters.handle === undefined) {
            throw new runtime.RequiredError('handle','Required parameter requestParameters.handle was null or undefined when calling getAgreementsByUserHandle.');
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

        if (requestParameters.sort !== undefined) {
            queryParameters['sort'] = requestParameters.sort;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/handle/{handle}/agreements`.replace(`{${"handle"}}`, encodeURIComponent(String(requestParameters.handle))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullAgreements["data"]>>;
    }

    /**
     * Gets a single user by their user ID
     */
    async getUser(requestParameters: GetUserRequest): Promise<NonNullable<FullUserResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getUser.');
        }

        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullUserResponse["data"]>>;
    }

    /**
     * Gets a single user by their handle
     */
    async getUserByHandle(requestParameters: GetUserByHandleRequest): Promise<NonNullable<FullUserResponse["data"]>> {
        if (requestParameters.handle === null || requestParameters.handle === undefined) {
            throw new runtime.RequiredError('handle','Required parameter requestParameters.handle was null or undefined when calling getUserByHandle.');
        }

        const queryParameters: any = {};

        if (requestParameters.userId !== undefined) {
            queryParameters['user_id'] = requestParameters.userId;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/handle/{handle}`.replace(`{${"handle"}}`, encodeURIComponent(String(requestParameters.handle))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FullUserResponse["data"]>>;
    }

    /**
     * Get the agreements the user recently listened to.
     */
    async getUsersAgreementHistory(requestParameters: GetUsersAgreementHistoryRequest): Promise<NonNullable<HistoryResponseFull["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getUsersAgreementHistory.');
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
            path: `/users/{id}/history/agreements`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<HistoryResponseFull["data"]>>;
    }

}

/**
    * @export
    * @enum {string}
    */
export enum GetAgreementsByUserSortEnum {
    Date = 'date',
    Plays = 'plays'
}
/**
    * @export
    * @enum {string}
    */
export enum GetAgreementsByUserHandleSortEnum {
    Date = 'date',
    Plays = 'plays'
}
