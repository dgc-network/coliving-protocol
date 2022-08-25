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
    AgreementResponse,
    AgreementResponseFromJSON,
    AgreementResponseToJSON,
    AgreementSearch,
    AgreementSearchFromJSON,
    AgreementSearchToJSON,
    AgreementsResponse,
    AgreementsResponseFromJSON,
    AgreementsResponseToJSON,
} from '../models';

export interface GetBulkAgreementsRequest {
    /**
     * The permalink of the agreement(s)
     */
    permalink?: Array<string>;
    /**
     * The ID of the agreement(s)
     */
    id?: Array<string>;
}

export interface GetAgreementRequest {
    /**
     * A Agreement ID
     */
    agreementId: string;
}

export interface GetTrendingAgreementsRequest {
    /**
     * Filter trending to a specified genre
     */
    genre?: string;
    /**
     * Calculate trending over a specified time range
     */
    time?: GetTrendingAgreementsTimeEnum;
}

export interface SearchAgreementsRequest {
    /**
     * The search query
     */
    query: string;
    /**
     * Return only downloadable agreements
     */
    onlyDownloadable?: string;
}

export interface StreamAgreementRequest {
    /**
     * A Agreement ID
     */
    agreementId: string;
}

/**
 * 
 */
export class AgreementsApi extends runtime.BaseAPI {

    /**
     * Gets a list of agreements using their IDs or permalinks
     */
    async getBulkAgreements(requestParameters: GetBulkAgreementsRequest = {}): Promise<NonNullable<AgreementsResponse["data"]>> {
        const queryParameters: any = {};

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
        }) as Promise<NonNullable<AgreementsResponse["data"]>>;
    }

    /**
     * Gets a agreement by ID
     */
    async getAgreement(requestParameters: GetAgreementRequest): Promise<NonNullable<AgreementResponse["data"]>> {
        if (requestParameters.agreementId === null || requestParameters.agreementId === undefined) {
            throw new runtime.RequiredError('agreementId','Required parameter requestParameters.agreementId was null or undefined when calling getAgreement.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/{agreement_id}`.replace(`{${"agreement_id"}}`, encodeURIComponent(String(requestParameters.agreementId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<AgreementResponse["data"]>>;
    }

    /**
     * Gets the top 100 trending (most popular) agreements on Coliving
     */
    async getTrendingAgreements(requestParameters: GetTrendingAgreementsRequest = {}): Promise<NonNullable<AgreementsResponse["data"]>> {
        const queryParameters: any = {};

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
        }) as Promise<NonNullable<AgreementsResponse["data"]>>;
    }

    /**
     * Search for a agreement or agreements
     */
    async searchAgreements(requestParameters: SearchAgreementsRequest): Promise<NonNullable<AgreementSearch["data"]>> {
        if (requestParameters.query === null || requestParameters.query === undefined) {
            throw new runtime.RequiredError('query','Required parameter requestParameters.query was null or undefined when calling searchAgreements.');
        }

        const queryParameters: any = {};

        if (requestParameters.query !== undefined) {
            queryParameters['query'] = requestParameters.query;
        }

        if (requestParameters.onlyDownloadable !== undefined) {
            queryParameters['only_downloadable'] = requestParameters.onlyDownloadable;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        return this.request({
            path: `/agreements/search`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }) as Promise<NonNullable<AgreementSearch["data"]>>;
    }

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