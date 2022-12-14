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
    Favorite,
    FavoriteFromJSON,
    FavoriteFromJSONTyped,
    FavoriteToJSON,
} from './favorite';
import {
    ContentListAddedTimestamp,
    ContentListAddedTimestampFromJSON,
    ContentListAddedTimestampFromJSONTyped,
    ContentListAddedTimestampToJSON,
} from './contentListAddedTimestamp';
import {
    ContentListArtwork,
    ContentListArtworkFromJSON,
    ContentListArtworkFromJSONTyped,
    ContentListArtworkToJSON,
} from './contentListArtwork';
import {
    Repost,
    RepostFromJSON,
    RepostFromJSONTyped,
    RepostToJSON,
} from './repost';
import {
    DigitalContentFull,
    DigitalContentFullFromJSON,
    DigitalContentFullFromJSONTyped,
    DigitalContentFullToJSON,
} from './digitalContentFull';
import {
    UserFull,
    UserFullFromJSON,
    UserFullFromJSONTyped,
    UserFullToJSON,
} from './userFull';

/**
 * 
 * @export
 * @interface ContentListFull
 */
export interface ContentListFull {
    /**
     * 
     * @type {ContentListArtwork}
     * @memberof ContentListFull
     */
    artwork?: ContentListArtwork;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    id: string;
    /**
     * 
     * @type {boolean}
     * @memberof ContentListFull
     */
    is_album: boolean;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    content_list_name: string;
    /**
     * 
     * @type {number}
     * @memberof ContentListFull
     */
    repost_count: number;
    /**
     * 
     * @type {number}
     * @memberof ContentListFull
     */
    favorite_count: number;
    /**
     * 
     * @type {number}
     * @memberof ContentListFull
     */
    total_play_count: number;
    /**
     * 
     * @type {UserFull}
     * @memberof ContentListFull
     */
    user: UserFull;
    /**
     * 
     * @type {number}
     * @memberof ContentListFull
     */
    blocknumber: number;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    created_at?: string;
    /**
     * 
     * @type {Array<Repost>}
     * @memberof ContentListFull
     */
    followee_reposts: Array<Repost>;
    /**
     * 
     * @type {Array<Favorite>}
     * @memberof ContentListFull
     */
    followee_favorites: Array<Favorite>;
    /**
     * 
     * @type {boolean}
     * @memberof ContentListFull
     */
    has_current_user_reposted: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ContentListFull
     */
    has_current_user_saved: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ContentListFull
     */
    is_delete: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ContentListFull
     */
    is_private: boolean;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    updated_at?: string;
    /**
     * 
     * @type {Array<ContentListAddedTimestamp>}
     * @memberof ContentListFull
     */
    added_timestamps: Array<ContentListAddedTimestamp>;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    user_id: string;
    /**
     * 
     * @type {Array<DigitalContentFull>}
     * @memberof ContentListFull
     */
    digitalContents: Array<DigitalContentFull>;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    cover_art?: string;
    /**
     * 
     * @type {string}
     * @memberof ContentListFull
     */
    cover_art_sizes?: string;
    /**
     * 
     * @type {number}
     * @memberof ContentListFull
     */
    digital_content_count: number;
}

