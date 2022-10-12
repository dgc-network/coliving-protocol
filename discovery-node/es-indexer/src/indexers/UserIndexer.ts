import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types'
import { groupBy, keyBy, merge } from 'lodash'
import { dialPg } from '../conn'
import { splitTags } from '../helpers/splitTags'
import { indexNames } from '../indexNames'
import { BlocknumberCheckpoint } from '../types/blocknumberCheckpoint'
import { UserDoc } from '../types/docs'
import { BaseIndexer } from './baseIndexer'
import {
  sharedIndexSettings,
  standardSuggest,
  standardText,
} from './sharedIndexSettings'

export class UserIndexer extends BaseIndexer<UserDoc> {
  constructor() {
    super('users', 'user_id')
  }

  mapping: IndicesCreateRequest = {
    index: indexNames.users,
    settings: merge(sharedIndexSettings, {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0,
        refresh_interval: '5s',
      },
    }),
    mappings: {
      dynamic: false,
      properties: {
        blocknumber: { type: 'integer' },
        created_at: { type: 'date' },
        wallet: { type: 'keyword' },
        suggest: standardSuggest,
        handle: {
          type: 'keyword',
          fields: {
            searchable: standardText,
          },
        },
        name: {
          type: 'keyword',
          fields: {
            searchable: standardText,
          },
        },
        is_verified: { type: 'boolean' },
        is_deactivated: { type: 'boolean' },
        location: { type: 'keyword' },

        // following
        following_ids: { type: 'keyword' },
        following_count: { type: 'integer' },

        // followers
        follower_count: { type: 'integer' },

        digital_content_count: { type: 'integer' },
        digitalContents: {
          properties: {
            mood: { type: 'keyword' },
            genre: { type: 'keyword' },
            tags: { type: 'keyword', normalizer: 'lower_asciifolding' },
          },
        },
      },
    },
  }

  baseSelect(): string {
    return `
    -- etl users
    select 
      users.*,
      coalesce(user_balances.balance, '0') as balance,
      coalesce(user_balances.associated_wallets_balance, '0') as associated_wallets_balance,
      coalesce(user_balances.wei_digitalcoin, '0') as wei_digitalcoin,
      coalesce(user_balances.wei_digitalcoin, '0') as wei_digitalcoin_balance, -- do we need both wei_digitalcoin and wei_digitalcoin_balance
      user_balances.associated_sol_wallets_balance,
      user_bank_accounts.bank_account as spl_wallet,
      coalesce(digital_content_count, 0) as digital_content_count,
      coalesce(content_list_count, 0) as content_list_count,
      coalesce(album_count, 0) as album_count,
      coalesce(follower_count, 0) as follower_count,
      coalesce(following_count, 0) as following_count,
      coalesce(repost_count, 0) as repost_count,
      coalesce(digital_content_save_count, 0) as digital_content_save_count,
      coalesce(supporter_count, 0) as supporter_count,
      coalesce(supporting_count, 0) as supporting_count
    from
      users
      left join aggregate_user on users.user_id = aggregate_user.user_id
      left join user_balances on users.user_id = user_balances.user_id
      left join user_bank_accounts on users.wallet = user_bank_accounts.ethereum_address
    where 
      is_current = true
    `
  }

  checkpointSql(checkpoint: BlocknumberCheckpoint): string {
    return `
      and users.user_id in (
        select user_id from users where is_current and blocknumber >= ${checkpoint.users}
        union
        select follower_user_id from follows where is_current and blocknumber >= ${checkpoint.users}
        union
        select followee_user_id from follows where is_current and blocknumber >= ${checkpoint.users}
        union
        select owner_id from digitalContents where is_current and blocknumber >= ${checkpoint.digitalContents}
      )
    `
  }

  async withBatch(rows: UserDoc[]) {
    // attach user's digitalContents
    const userIds = rows.map((r) => r.user_id)
    const [digitalContentsByOwnerId, followMap] = await Promise.all([
      this.userDigitalContents(userIds),
      this.userFollows(userIds),
    ])
    for (let user of rows) {
      user.digitalContents = digitalContentsByOwnerId[user.user_id] || []
      user.digital_content_count = user.digitalContents.length
      user.following_ids = followMap[user.user_id] || []
    }
  }

  withRow(row: UserDoc) {
    row.suggest = [row.handle, row.name].filter((x) => x).join(' ')
    row.following_count = row.following_ids.length
  }

  private async userFollows(
    userIds: number[]
  ): Promise<Record<number, number[]>> {
    if (!userIds.length) return {}
    const idList = Array.from(userIds).join(',')
    const q = `
      select 
        follower_user_id,
        followee_user_id 
      from follows
      where is_current = true
        and is_delete = false
        and follower_user_id in (${idList})
      order by created_at desc
    `
    const result = await dialPg().query(q)
    const grouped = groupBy(result.rows, 'follower_user_id')
    for (let [user_id, follow_rows] of Object.entries(grouped)) {
      //grouped[user_id] = follow_rows.map((r) => r.followee_user_id)
      grouped[user_id] = grouped[follow_rows].map((r) => r.followee_user_id)
    }
    return grouped
  }

  private async userDigitalContents(userIds: number[]) {
    if (!userIds.length) return {}
    const pg = dialPg()
    const idList = Array.from(userIds).join(',')
    const q = `
      select 
        digital_content_id, owner_id, genre, mood, tags, title, length, created_at
      from digitalContents 
      where 
        is_current
        and not is_delete 
        and not is_unlisted
        and stem_of is null
        and owner_id in (${idList})
      order by created_at desc
    `
    const allDigitalContents = await pg.query(q)
    for (let t of allDigitalContents.rows) {
      t.tags = splitTags(t.tags)
    }
    const grouped = groupBy(allDigitalContents.rows, 'owner_id')
    return grouped
  }
}
