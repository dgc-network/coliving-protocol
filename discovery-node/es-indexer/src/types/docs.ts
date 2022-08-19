import {
  FollowRow,
  PlaylistRow,
  RepostRow,
  SaveRow,
  AgreementRow,
  UserRow,
} from './db'

export type EntityUserDoc = {
  handle: string
  name: string
  location: string
  follower_count: number
  created_at: Date
  updated_at: Date
}

export type PlaylistDoc = PlaylistRow & {
  suggest: string
  agreements: AgreementDoc[]
  save_count: number
  saved_by: number[]
  repost_count: number
  reposted_by: number[]
  total_play_count: number
  user: EntityUserDoc
}

export type UserDoc = UserRow & {
  suggest: string
  agreements: AgreementRow[]
  agreement_count: number
  following_ids: number[]
  following_count: number
}

export type AgreementDoc = AgreementRow & {
  suggest: string
  reposted_by: number[]
  saved_by: number[]
  routes: string[]
  permalink: string
  tag_list: string[]
  repost_count: number
  favorite_count: number
  play_count: any // todo: is it a string or number?  pg returns string
  downloadable: boolean
  user: EntityUserDoc
  duration: number
}

export type RepostDoc = RepostRow & {
  item_key: string
  repost_id: string
}

export type SaveDoc = SaveRow & {
  item_key: string
  save_id: string
}

export type FollowDoc = FollowRow & {
  follow_id: string
}
