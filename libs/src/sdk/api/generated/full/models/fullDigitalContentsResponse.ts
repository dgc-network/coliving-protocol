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
    DigitalContentFull,
    DigitalContentFullFromJSON,
    DigitalContentFullFromJSONTyped,
    DigitalContentFullToJSON,
} from './digitalContentFull';
import {
    VersionMetadata,
    VersionMetadataFromJSON,
    VersionMetadataFromJSONTyped,
    VersionMetadataToJSON,
} from './versionMetadata';

/**
 * 
 * @export
 * @interface FullDigitalContentsResponse
 */
export interface FullDigitalContentsResponse {
    /**
     * 
     * @type {number}
     * @memberof FullDigitalContentsResponse
     */
    latest_chain_block: number;
    /**
     * 
     * @type {number}
     * @memberof FullDigitalContentsResponse
     */
    latest_indexed_block: number;
    /**
     * 
     * @type {number}
     * @memberof FullDigitalContentsResponse
     */
    latest_chain_slot_plays: number;
    /**
     * 
     * @type {number}
     * @memberof FullDigitalContentsResponse
     */
    latest_indexed_slot_plays: number;
    /**
     * 
     * @type {string}
     * @memberof FullDigitalContentsResponse
     */
    signature: string;
    /**
     * 
     * @type {string}
     * @memberof FullDigitalContentsResponse
     */
    timestamp: string;
    /**
     * 
     * @type {VersionMetadata}
     * @memberof FullDigitalContentsResponse
     */
    version: VersionMetadata;
    /**
     * 
     * @type {Array<DigitalContentFull>}
     * @memberof FullDigitalContentsResponse
     */
    data?: Array<DigitalContentFull>;
}

