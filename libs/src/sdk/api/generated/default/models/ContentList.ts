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

import {
    ContentListArtwork,
    ContentListArtworkFromJSON,
    ContentListArtworkFromJSONTyped,
    ContentListArtworkToJSON,
} from './ContentListArtwork';
import {
    User,
    UserFromJSON,
    UserFromJSONTyped,
    UserToJSON,
} from './User';

/**
 * 
 * @export
 * @interface ContentList
 */
export interface ContentList {
    /**
     * 
     * @type {ContentListArtwork}
     * @memberof ContentList
     */
    artwork?: ContentListArtwork;
    /**
     * 
     * @type {string}
     * @memberof ContentList
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof ContentList
     */
    id: string;
    /**
     * 
     * @type {boolean}
     * @memberof ContentList
     */
    is_album: boolean;
    /**
     * 
     * @type {string}
     * @memberof ContentList
     */
    content_list_name: string;
    /**
     * 
     * @type {number}
     * @memberof ContentList
     */
    repost_count: number;
    /**
     * 
     * @type {number}
     * @memberof ContentList
     */
    favorite_count: number;
    /**
     * 
     * @type {number}
     * @memberof ContentList
     */
    total_play_count: number;
    /**
     * 
     * @type {User}
     * @memberof ContentList
     */
    user: User;
}

