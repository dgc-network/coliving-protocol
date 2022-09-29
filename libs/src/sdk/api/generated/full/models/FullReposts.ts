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
    ActivityFull,
    ActivityFullFromJSON,
    ActivityFullFromJSONTyped,
    ActivityFullToJSON,
} from './activityFull';
import {
    VersionMetadata,
    VersionMetadataFromJSON,
    VersionMetadataFromJSONTyped,
    VersionMetadataToJSON,
} from './versionMetadata';

/**
 * 
 * @export
 * @interface FullReposts
 */
export interface FullReposts {
    /**
     * 
     * @type {number}
     * @memberof FullReposts
     */
    latest_chain_block: number;
    /**
     * 
     * @type {number}
     * @memberof FullReposts
     */
    latest_indexed_block: number;
    /**
     * 
     * @type {number}
     * @memberof FullReposts
     */
    latest_chain_slot_plays: number;
    /**
     * 
     * @type {number}
     * @memberof FullReposts
     */
    latest_indexed_slot_plays: number;
    /**
     * 
     * @type {string}
     * @memberof FullReposts
     */
    signature: string;
    /**
     * 
     * @type {string}
     * @memberof FullReposts
     */
    timestamp: string;
    /**
     * 
     * @type {VersionMetadata}
     * @memberof FullReposts
     */
    version: VersionMetadata;
    /**
     * 
     * @type {Array<ActivityFull>}
     * @memberof FullReposts
     */
    data?: Array<ActivityFull>;
}

