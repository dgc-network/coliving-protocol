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

import {
    AgreementFull,
    AgreementFullFromJSON,
    AgreementFullFromJSONTyped,
    AgreementFullToJSON,
} from './agreementFull';
import {
    VersionMetadata,
    VersionMetadataFromJSON,
    VersionMetadataFromJSONTyped,
    VersionMetadataToJSON,
} from './versionMetadata';

/**
 * 
 * @export
 * @interface RemixingResponse
 */
export interface RemixingResponse {
    /**
     * 
     * @type {number}
     * @memberof RemixingResponse
     */
    latest_chain_block: number;
    /**
     * 
     * @type {number}
     * @memberof RemixingResponse
     */
    latest_indexed_block: number;
    /**
     * 
     * @type {number}
     * @memberof RemixingResponse
     */
    latest_chain_slot_plays: number;
    /**
     * 
     * @type {number}
     * @memberof RemixingResponse
     */
    latest_indexed_slot_plays: number;
    /**
     * 
     * @type {string}
     * @memberof RemixingResponse
     */
    signature: string;
    /**
     * 
     * @type {string}
     * @memberof RemixingResponse
     */
    timestamp: string;
    /**
     * 
     * @type {VersionMetadata}
     * @memberof RemixingResponse
     */
    version: VersionMetadata;
    /**
     * 
     * @type {Array<AgreementFull>}
     * @memberof RemixingResponse
     */
    data?: Array<AgreementFull>;
}

