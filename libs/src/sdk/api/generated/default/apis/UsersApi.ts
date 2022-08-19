// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * API
 * Coliving V1 API
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
    ConnectedWalletsResponse,
    ConnectedWalletsResponseFromJSON,
    ConnectedWalletsResponseToJSON,
    FavoritesResponse,
    FavoritesResponseFromJSON,
    FavoritesResponseToJSON,
    FollowersResponse,
    FollowersResponseFromJSON,
    FollowersResponseToJSON,
    FollowingResponse,
    FollowingResponseFromJSON,
    FollowingResponseToJSON,
    GetSupporter,
    GetSupporterFromJSON,
    GetSupporterToJSON,
    GetSupporters,
    GetSupportersFromJSON,
    GetSupportersToJSON,
    GetSupporting,
    GetSupportingFromJSON,
    GetSupportingToJSON,
    HistoryResponse,
    HistoryResponseFromJSON,
    HistoryResponseToJSON,
    RelatedArtistResponse,
    RelatedArtistResponseFromJSON,
    RelatedArtistResponseToJSON,
    Reposts,
    RepostsFromJSON,
    RepostsToJSON,
    TagsResponse,
    TagsResponseFromJSON,
    TagsResponseToJSON,
    TopGenreUsersResponse,
    TopGenreUsersResponseFromJSON,
    TopGenreUsersResponseToJSON,
    TopUsersResponse,
    TopUsersResponseFromJSON,
    TopUsersResponseToJSON,
    AgreementsResponse,
    AgreementsResponseFromJSON,
    AgreementsResponseToJSON,
    UserAssociatedWalletResponse,
    UserAssociatedWalletResponseFromJSON,
    UserAssociatedWalletResponseToJSON,
    UserResponse,
    UserResponseFromJSON,
    UserResponseToJSON,
    UserSearch,
    UserSearchFromJSON,
    UserSearchToJSON,
    VerifyToken,
    VerifyTokenFromJSON,
    VerifyTokenToJSON,
} from '../models';

export interface GetConnectedWalletsRequest {
    /**
     * A User ID
     */
    id: string;
}

export interface GetFavoritesRequest {
    /**
     * A User ID
     */
    id: string;
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
}

export interface GetTopAgreementTagsRequest {
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

export interface GetUserIDFromWalletRequest {
    /**
     * Wallet address
     */
    associatedWallet: string;
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

export interface SearchUsersRequest {
    /**
     * The search query
     */
    query: string;
}

export interface VerifyIDTokenRequest {
    /**
     * JWT to verify
     */
    token: string;
}

/**
 * 
 */
export class UsersApi extends runtime.BaseAPI {

    /**
     * Get the User\'s ERC and SPL connected wallets
     */
    async getConnectedWallets(requestParameters: GetConnectedWalletsRequest): Promise<NonNullable<ConnectedWalletsResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getConnectedWallets.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/connected_wallets`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<ConnectedWalletsResponse["data"]>>;
    }

    /**
     * Gets a user\'s favorite agreements
     */
    async getFavorites(requestParameters: GetFavoritesRequest): Promise<NonNullable<FavoritesResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getFavorites.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/favorites`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<FavoritesResponse["data"]>>;
    }

    /**
     * All users that follow the provided user
     */
    async getFollowers(requestParameters: GetFollowersRequest): Promise<NonNullable<FollowersResponse["data"]>> {
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
        }) as Promise<NonNullable<FollowersResponse["data"]>>;
    }

    /**
     * All users that the provided user follows
     */
    async getFollowings(requestParameters: GetFollowingsRequest): Promise<NonNullable<FollowingResponse["data"]>> {
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
        }) as Promise<NonNullable<FollowingResponse["data"]>>;
    }

    /**
     * Gets a list of users that might be of interest to followers of this user.
     */
    async getRelatedUsers(requestParameters: GetRelatedUsersRequest): Promise<NonNullable<RelatedArtistResponse["data"]>> {
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
        }) as Promise<NonNullable<RelatedArtistResponse["data"]>>;
    }

    /**
     * Gets the given user\'s reposts
     */
    async getReposts(requestParameters: GetRepostsRequest): Promise<NonNullable<Reposts["data"]>> {
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
        }) as Promise<NonNullable<Reposts["data"]>>;
    }

    /**
     * Gets the user\'s reposts by the user handle
     */
    async getRepostsByHandle(requestParameters: GetRepostsByHandleRequest): Promise<NonNullable<Reposts["data"]>> {
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
        }) as Promise<NonNullable<Reposts["data"]>>;
    }

    /**
     * Gets the specified supporter of the given user
     */
    async getSupporter(requestParameters: GetSupporterRequest): Promise<NonNullable<GetSupporter["data"]>> {
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
        }) as Promise<NonNullable<GetSupporter["data"]>>;
    }

    /**
     * Gets the supporters of the given user
     */
    async getSupporters(requestParameters: GetSupportersRequest): Promise<NonNullable<GetSupporters["data"]>> {
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

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/supporters`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<GetSupporters["data"]>>;
    }

    /**
     * Gets the support from the given user to the supported user
     */
    async getSupporting(requestParameters: GetSupportingRequest): Promise<NonNullable<GetSupporting["data"]>> {
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
        }) as Promise<NonNullable<GetSupporting["data"]>>;
    }

    /**
     * Gets the users that the given user supports
     */
    async getSupportings(requestParameters: GetSupportingsRequest): Promise<NonNullable<GetSupporting["data"]>> {
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

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}/supporting`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<GetSupporting["data"]>>;
    }

    /**
     * Gets the most used agreement tags by a user.
     * Fetch most used tags in a user\'s agreements
     */
    async getTopAgreementTags(requestParameters: GetTopAgreementTagsRequest): Promise<NonNullable<TagsResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getTopAgreementTags.');
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
            path: `/users/{id}/tags`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TagsResponse["data"]>>;
    }

    /**
     * Get the Top Users having at least one agreement by follower count
     */
    async getTopUsers(requestParameters: GetTopUsersRequest = {}): Promise<NonNullable<TopUsersResponse["data"]>> {
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
        }) as Promise<NonNullable<TopUsersResponse["data"]>>;
    }

    /**
     * Get the Top Users for a Given Genre
     */
    async getTopUsersInGenre(requestParameters: GetTopUsersInGenreRequest = {}): Promise<NonNullable<TopGenreUsersResponse["data"]>> {
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
        }) as Promise<NonNullable<TopGenreUsersResponse["data"]>>;
    }

    /**
     * Gets the agreements created by a user using their user ID
     */
    async getAgreementsByUser(requestParameters: GetAgreementsByUserRequest): Promise<NonNullable<AgreementsResponse["data"]>> {
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
        }) as Promise<NonNullable<AgreementsResponse["data"]>>;
    }

    /**
     * Gets the agreements created by a user using the user\'s handle
     */
    async getAgreementsByUserHandle(requestParameters: GetAgreementsByUserHandleRequest): Promise<NonNullable<AgreementsResponse["data"]>> {
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
        }) as Promise<NonNullable<AgreementsResponse["data"]>>;
    }

    /**
     * Gets a single user by their user ID
     */
    async getUser(requestParameters: GetUserRequest): Promise<NonNullable<UserResponse["data"]>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getUser.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<UserResponse["data"]>>;
    }

    /**
     * Gets a single user by their handle
     */
    async getUserByHandle(requestParameters: GetUserByHandleRequest): Promise<NonNullable<UserResponse["data"]>> {
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
        }) as Promise<NonNullable<UserResponse["data"]>>;
    }

    /**
     * Gets a User ID from an associated wallet address
     */
    async getUserIDFromWallet(requestParameters: GetUserIDFromWalletRequest): Promise<NonNullable<UserAssociatedWalletResponse["data"]>> {
        if (requestParameters.associatedWallet === null || requestParameters.associatedWallet === undefined) {
            throw new runtime.RequiredError('associatedWallet','Required parameter requestParameters.associatedWallet was null or undefined when calling getUserIDFromWallet.');
        }

        const queryParameters: any = {};

        if (requestParameters.associatedWallet !== undefined) {
            queryParameters['associated_wallet'] = requestParameters.associatedWallet;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/id`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<UserAssociatedWalletResponse["data"]>>;
    }

    /**
     * Get the agreements the user recently listened to.
     */
    async getUsersAgreementHistory(requestParameters: GetUsersAgreementHistoryRequest): Promise<NonNullable<HistoryResponse["data"]>> {
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
        }) as Promise<NonNullable<HistoryResponse["data"]>>;
    }

    /**
     * Search for users that match the given query
     */
    async searchUsers(requestParameters: SearchUsersRequest): Promise<NonNullable<UserSearch["data"]>> {
        if (requestParameters.query === null || requestParameters.query === undefined) {
            throw new runtime.RequiredError('query','Required parameter requestParameters.query was null or undefined when calling searchUsers.');
        }

        const queryParameters: any = {};

        if (requestParameters.query !== undefined) {
            queryParameters['query'] = requestParameters.query;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/search`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<UserSearch["data"]>>;
    }

    /**
     * Verify if the given jwt ID token was signed by the subject (user) in the payload
     */
    async verifyIDToken(requestParameters: VerifyIDTokenRequest): Promise<NonNullable<VerifyToken["data"]>> {
        if (requestParameters.token === null || requestParameters.token === undefined) {
            throw new runtime.RequiredError('token','Required parameter requestParameters.token was null or undefined when calling verifyIDToken.');
        }

        const queryParameters: any = {};

        if (requestParameters.token !== undefined) {
            queryParameters['token'] = requestParameters.token;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/users/verify_token`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<VerifyToken["data"]>>;
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
