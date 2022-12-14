export type Maybe<T> = T | undefined
export type Nullable<T> = T | null

export interface Logger {
  /**
   * Write a 'info' level log.
   */
  info: (message: any, ...optionalParams: any[]) => any

  /**
   * Write an 'error' level log.
   */
  error: (message: any, ...optionalParams: any[]) => any

  /**
   * Write a 'warn' level log.
   */
  warn: (message: any, ...optionalParams: any[]) => any

  /**
   * Write a 'debug' level log.
   */
  debug?: (message: any, ...optionalParams: any[]) => any
}

type CID = string
type ID = number
type UID = string

export type UserMetadata = {
  user_id: number
  album_count: number
  bio: string | null
  cover_photo: Nullable<CID>
  content_node_endpoint: Nullable<string>
  current_user_followee_follow_count: number
  does_current_user_follow: boolean
  followee_count: number
  follower_count: number
  supporter_count: number
  supporting_count: number
  handle: string
  handle_lc: string
  is_deactivated: boolean
  is_verified: boolean
  location: Nullable<string>
  // this should be removed
  is_creator: boolean
  name: string
  content_list_count: number
  profile_picture: Nullable<CID>
  repost_count: number
  digital_content_count: number
  cover_photo_sizes: Nullable<CID>
  profile_picture_sizes: Nullable<CID>
  metadata_multihash: Nullable<CID>
  has_collectibles: boolean
  collectiblesOrderUnset?: boolean

  // Only present on the "current" account
  does_follow_current_user?: boolean
  digital_content_save_count?: number
  twitter_handle?: string
  instagram_handle?: string
  tiktok_handle?: string
  website?: string
  wallet?: string
  donation?: string
  twitterVerified?: boolean
  instagramVerified?: boolean
}

export type User = UserMetadata

export interface DigitalContentSegment {
  duration: string
  multihash: CID
}
export interface Download {
  is_downloadable: Nullable<boolean>
  requires_follow: Nullable<boolean>
  cid: Nullable<string>
}

export type DigitalContentMetadata = {
  blocknumber: number
  activity_timestamp?: string
  is_delete: boolean
  digital_content_id: number
  created_at: string
  isrc: Nullable<string>
  iswc: Nullable<string>
  credits_splits: Nullable<string>
  description: Nullable<string>
  download: Nullable<Download>
  genre: string
  has_current_user_reposted: boolean
  has_current_user_saved: boolean
  license: Nullable<string>
  mood: Nullable<string>
  play_count: number
  owner_id: ID
  release_date: Nullable<string>
  repost_count: number
  save_count: number
  tags: Nullable<string>
  title: string
  digital_content_segments: DigitalContentSegment[]
  cover_art: Nullable<CID>
  cover_art_sizes: Nullable<CID>
  is_unlisted: boolean
  is_available: boolean
  listenCount?: number
  permalink: string

  // Optional Fields
  is_invalid?: boolean
  stem_of?: {
    parent_digital_content_id: ID
  }

  // Added fields
  dateListened?: string
  duration: number
}

export type CollectionMetadata = {
  blocknumber: number
  description: Nullable<string>
  has_current_user_reposted: boolean
  has_current_user_saved: boolean
  is_album: boolean
  is_delete: boolean
  is_private: boolean
  content_list_contents: {
    digital_content_ids: Array<{ time: number; digital_content: ID; uid?: UID }>
  }
  digitalContents?: DigitalContentMetadata[]
  digital_content_count: number
  content_list_id: ID
  cover_art: CID | null
  cover_art_sizes: Nullable<CID>
  content_list_name: string
  content_list_owner_id: ID
  repost_count: number
  save_count: number
  upc?: string | null
  updated_at: string
  activity_timestamp?: string
}
