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
    RemixParent,
    RemixParentFromJSON,
    RemixParentFromJSONTyped,
    RemixParentToJSON,
} from './RemixParent';
import {
    AgreementArtwork,
    AgreementArtworkFromJSON,
    AgreementArtworkFromJSONTyped,
    AgreementArtworkToJSON,
} from './AgreementArtwork';
import {
    User,
    UserFromJSON,
    UserFromJSONTyped,
    UserToJSON,
} from './User';

/**
 * 
 * @export
 * @interface Agreement
 */
export interface Agreement {
    /**
     * 
     * @type {AgreementArtwork}
     * @memberof Agreement
     */
    artwork?: AgreementArtwork;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    genre?: string;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    mood?: string;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    release_date?: string;
    /**
     * 
     * @type {RemixParent}
     * @memberof Agreement
     */
    remix_of?: RemixParent;
    /**
     * 
     * @type {number}
     * @memberof Agreement
     */
    repost_count: number;
    /**
     * 
     * @type {number}
     * @memberof Agreement
     */
    favorite_count: number;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    tags?: string;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    title: string;
    /**
     * 
     * @type {User}
     * @memberof Agreement
     */
    user: User;
    /**
     * 
     * @type {number}
     * @memberof Agreement
     */
    duration: number;
    /**
     * 
     * @type {boolean}
     * @memberof Agreement
     */
    downloadable?: boolean;
    /**
     * 
     * @type {number}
     * @memberof Agreement
     */
    play_count: number;
    /**
     * 
     * @type {string}
     * @memberof Agreement
     */
    permalink?: string;
}

