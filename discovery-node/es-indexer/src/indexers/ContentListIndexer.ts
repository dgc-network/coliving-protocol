import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types'
import { keyBy, merge } from 'lodash'
import { dialPg } from '../conn'
import { splitTags } from '../helpers/splitTags'
import { indexNames } from '../indexNames'
import { BlocknumberCheckpoint } from '../types/blocknumberCheckpoint'
import { ContentListDoc } from '../types/docs'
import { BaseIndexer } from './baseIndexer'
import {
  sharedIndexSettings,
  standardSuggest,
  standardText,
} from './sharedIndexSettings'

export class ContentListIndexer extends BaseIndexer<ContentListDoc> {
  constructor() {
    super('contentLists', 'content_list_id')
  }

  mapping: IndicesCreateRequest = {
    index: indexNames.contentLists,
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
        content_list_owner_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        is_album: { type: 'boolean' },
        is_private: { type: 'boolean' },
        is_delete: { type: 'boolean' },
        suggest: standardSuggest,
        content_list_name: {
          type: 'keyword',
          fields: {
            searchable: standardText,
          },
        },
        'content_list_contents.digital_content_ids.digital_content': { type: 'keyword' },

        user: {
          properties: {
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
            location: { type: 'keyword' },
            follower_count: { type: 'integer' },
            is_verified: { type: 'boolean' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },

        // saves
        saved_by: { type: 'keyword' },
        save_count: { type: 'integer' },
        // reposts
        reposted_by: { type: 'keyword' },
        repost_count: { type: 'integer' },

        agreements: {
          properties: {
            mood: { type: 'keyword' },
            genre: { type: 'keyword' },
            tags: {
              type: 'keyword',
              normalizer: 'lower_asciifolding',
            },
            play_count: { type: 'integer' },
            repost_count: { type: 'integer' },
            save_count: { type: 'integer' },
          },
        },
      },
    },
  }

  baseSelect(): string {
    return `
      -- etl contentLists
      select 
        contentLists.*,

        json_build_object(
          'handle', users.handle,
          'name', users.name,
          'location', users.location,
          'follower_count', follower_count,
          'is_verified', users.is_verified,
          'created_at', users.created_at,
          'updated_at', users.updated_at
        ) as user,

        array(
          select user_id 
          from reposts
          where
            is_current = true
            and is_delete = false
            and repost_type = (case when is_album then 'album' else 'contentList' end)::reposttype
            and repost_item_id = content_list_id
            order by created_at desc
        ) as reposted_by,
      
        array(
          select user_id 
          from saves
          where
            is_current = true
            and is_delete = false
            and save_type = (case when is_album then 'album' else 'contentList' end)::savetype
            and save_item_id = content_list_id
            order by created_at desc
        ) as saved_by

      from contentLists 
      join users on content_list_owner_id = user_id
      left join aggregate_user on users.user_id = aggregate_user.user_id
      where 
        contentLists.is_current
        AND users.is_current
    `
  }

  checkpointSql(checkpoint: BlocknumberCheckpoint): string {
    // really we should mark contentList stale if any of the contentList agreements changes
    // but don't know how to do the sql for that... so the low tech solution would be to re-do contentLists from scratch
    // which might actually be faster, since it's a very small collection
    // in which case we could just delete this function

    // digital_content play_count will also go stale (same problem as above)

    return `
      and content_list_id in (
        select content_list_id from contentLists where is_current and blocknumber >= ${checkpoint.contentLists}
        union
        select save_item_id from saves where is_current and save_type in ('contentList', 'album') and blocknumber >= ${checkpoint.saves}
        union
        select repost_item_id from reposts where is_current and repost_type in ('contentList', 'album') and blocknumber >= ${checkpoint.reposts}
      )`
  }

  async withBatch(rows: ContentListDoc[]) {
    // collect all the digital_content IDs
    const agreementIds = new Set<number>()
    for (let row of rows) {
      row.content_list_contents.digital_content_ids
        .map((t: any) => t.digital_content)
        .filter(Boolean)
        .forEach((t: any) => agreementIds.add(t))
    }

    // fetch the agreements...
    const agreementsById = await this.getAgreements(Array.from(agreementIds))

    // pull digital_content data onto contentList
    for (let contentList of rows) {
      contentList.agreements = contentList.content_list_contents.digital_content_ids
        .map((t: any) => agreementsById[t.digital_content])
        .filter(Boolean)

      contentList.total_play_count = contentList.agreements.reduce(
        (acc, s) => acc + parseInt(s.play_count),
        0
      )
    }
  }

  withRow(row: ContentListDoc) {
    row.suggest = [row.content_list_name, row.user.handle, row.user.name]
      .filter((x) => x)
      .join(' ')
    row.repost_count = row.reposted_by.length
    row.save_count = row.saved_by.length
  }

  private async getAgreements(agreementIds: number[]) {
    if (!agreementIds.length) return {}
    const pg = dialPg()
    const idList = Array.from(agreementIds).join(',')
    // do we want landlord name from users
    // or save + repost counts from aggregate_digital_content?
    const q = `
      select 
        digital_content_id,
        genre,
        mood,
        tags,
        title,
        length,
        created_at,
        coalesce(aggregate_digital_content.repost_count, 0) as repost_count,
        coalesce(aggregate_digital_content.save_count, 0) as save_count,
        coalesce(aggregate_plays.count, 0) as play_count
  
      from agreements
      left join aggregate_digital_content using (digital_content_id)
      left join aggregate_plays on agreements.digital_content_id = aggregate_plays.play_item_id
      where 
        is_current 
        and not is_delete 
        and not is_unlisted 
        and digital_content_id in (${idList})`
    const allAgreements = await pg.query(q)
    for (let t of allAgreements.rows) {
      t.tags = splitTags(t.tags)
    }
    return keyBy(allAgreements.rows, 'digital_content_id')
  }
}
