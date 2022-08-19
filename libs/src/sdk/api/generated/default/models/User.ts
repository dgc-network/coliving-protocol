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
    CoverPhoto,
    CoverPhotoFromJSON,
    CoverPhotoFromJSONTyped,
    CoverPhotoToJSON,
} from './CoverPhoto';
import {
    ProfilePicture,
    ProfilePictureFromJSON,
    ProfilePictureFromJSONTyped,
    ProfilePictureToJSON,
} from './ProfilePicture';

/**
 * 
 * @export
 * @interface User
 */
export interface User {
    /**
     * 
     * @type {number}
     * @memberof User
     */
    album_count: number;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    bio?: string;
    /**
     * 
     * @type {CoverPhoto}
     * @memberof User
     */
    cover_photo?: CoverPhoto;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    followee_count: number;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    follower_count: number;
    /**
     * 
     * @type {boolean}
     * @memberof User
     */
    does_follow_current_user?: boolean;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    handle: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    id: string;
    /**
     * 
     * @type {boolean}
     * @memberof User
     */
    is_verified: boolean;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    location?: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    name: string;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    playlist_count: number;
    /**
     * 
     * @type {ProfilePicture}
     * @memberof User
     */
    profile_picture?: ProfilePicture;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    repost_count: number;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    agreement_count: number;
    /**
     * 
     * @type {boolean}
     * @memberof User
     */
    is_deactivated: boolean;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    erc_wallet?: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    spl_wallet: string;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    supporter_count: number;
    /**
     * 
     * @type {number}
     * @memberof User
     */
    supporting_count: number;
}

