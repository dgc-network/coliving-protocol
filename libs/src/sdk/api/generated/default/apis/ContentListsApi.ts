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
    ContentListResponse,
    ContentListResponseFromJSON,
    ContentListResponseToJSON,
    ContentListSearchResult,
    ContentListSearchResultFromJSON,
    ContentListSearchResultToJSON,
    ContentListAgreementsResponse,
    ContentListAgreementsResponseFromJSON,
    ContentListAgreementsResponseToJSON,
    TrendingContentListsResponse,
    TrendingContentListsResponseFromJSON,
    TrendingContentListsResponseToJSON,
} from '../models';

export interface GetContentListRequest {
    /**
     * A ContentList ID
     */
    contentListId: string;
}

export interface GetContentListAgreementsRequest {
    /**
     * A ContentList ID
     */
    contentListId: string;
}

export interface GetTrendingContentListsRequest {
    /**
     * Calculate trending over a specified time range
     */
    time?: GetTrendingContentListsTimeEnum;
}

export interface SearchContentListsRequest {
    /**
     * The search query
     */
    query: string;
}

/**
 * 
 */
export class ContentListsApi extends runtime.BaseAPI {

    /**
     * Get a contentList by ID
     */
    async getContentList(requestParameters: GetContentListRequest): Promise<NonNullable<ContentListResponse["data"]>> {
        if (requestParameters.contentListId === null || requestParameters.contentListId === undefined) {
            throw new runtime.RequiredError('contentListId','Required parameter requestParameters.contentListId was null or undefined when calling getContentList.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/contentLists/{content_list_id}`.replace(`{${"content_list_id"}}`, encodeURIComponent(String(requestParameters.contentListId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<ContentListResponse["data"]>>;
    }

    /**
     * Fetch agreements within a contentList.
     */
    async getContentListAgreements(requestParameters: GetContentListAgreementsRequest): Promise<NonNullable<ContentListAgreementsResponse["data"]>> {
        if (requestParameters.contentListId === null || requestParameters.contentListId === undefined) {
            throw new runtime.RequiredError('contentListId','Required parameter requestParameters.contentListId was null or undefined when calling getContentListAgreements.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/contentLists/{content_list_id}/agreements`.replace(`{${"content_list_id"}}`, encodeURIComponent(String(requestParameters.contentListId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<ContentListAgreementsResponse["data"]>>;
    }

    /**
     * Gets trending contentLists for a time period
     */
    async getTrendingContentLists(requestParameters: GetTrendingContentListsRequest = {}): Promise<NonNullable<TrendingContentListsResponse["data"]>> {
        const queryParameters: any = {};

        if (requestParameters.time !== undefined) {
            queryParameters['time'] = requestParameters.time;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/contentLists/trending`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<TrendingContentListsResponse["data"]>>;
    }

    /**
     * Search for a contentList
     */
    async searchContentLists(requestParameters: SearchContentListsRequest): Promise<NonNullable<ContentListSearchResult["data"]>> {
        if (requestParameters.query === null || requestParameters.query === undefined) {
            throw new runtime.RequiredError('query','Required parameter requestParameters.query was null or undefined when calling searchContentLists.');
        }

        const queryParameters: any = {};

        if (requestParameters.query !== undefined) {
            queryParameters['query'] = requestParameters.query;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/contentLists/search`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<ContentListSearchResult["data"]>>;
    }

}

/**
    * @export
    * @enum {string}
    */
export enum GetTrendingContentListsTimeEnum {
    Week = 'week',
    Month = 'month',
    Year = 'year',
    AllTime = 'allTime'
}