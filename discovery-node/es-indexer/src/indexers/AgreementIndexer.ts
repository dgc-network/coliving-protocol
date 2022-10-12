import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types'
import { merge } from 'lodash'
import { splitTags } from '../helpers/splitTags'
import { indexNames } from '../indexNames'
import { BlocknumberCheckpoint } from '../types/blocknumberCheckpoint'
import { AgreementDoc } from '../types/docs'
import { BaseIndexer } from './baseIndexer'
import {
  sharedIndexSettings,
  standardSuggest,
  standardText,
} from './sharedIndexSettings'

export class AgreementIndexer extends BaseIndexer<AgreementDoc> {
  constructor() {
    super('agreements', 'digital_content_id')
    this.batchSize = 500
  }

  mapping: IndicesCreateRequest = {
    index: indexNames.agreements,
    settings: merge(sharedIndexSettings, {
      analysis: {
        tokenizer: {
          comma_tokenizer: {
            // @ts-ignore - es client typings lagging
            type: 'simple_pattern_split',
            pattern: ',',
          },
        },
        analyzer: {
          // @ts-ignore - es client typings lagging
          comma_analyzer: {
            tokenizer: 'comma_tokenizer',
            filter: ['lowercase', 'asciifolding'],
          },
        },
      },
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
        owner_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        permalink: { type: 'keyword' },
        route_id: { type: 'keyword' },
        routes: { type: 'keyword' },
        title: {
          type: 'keyword',
          fields: {
            searchable: standardText,
          },
        },
        length: { type: 'integer' },
        tag_list: {
          type: 'keyword',
          normalizer: 'lower_asciifolding',
        },
        genre: { type: 'keyword' },
        mood: { type: 'keyword' },
        is_delete: { type: 'boolean' },
        is_unlisted: { type: 'boolean' },
        downloadable: { type: 'boolean' },

        // saves
        saved_by: { type: 'keyword' },
        save_count: { type: 'integer' },
        // reposts
        reposted_by: { type: 'keyword' },
        repost_count: { type: 'integer' },

        suggest: standardSuggest,

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

        stem_of: {
          properties: {
            category: { type: 'keyword' },
            parent_digital_content_id: { type: 'keyword' },
          },
        },

        'remix_of.agreements.parent_digital_content_id': { type: 'keyword' },
      },
    },
  }

  baseSelect(): string {
    return `
    -- etl agreements
    select 
      agreements.*,
      (agreements.download->>'is_downloadable')::boolean as downloadable,
      coalesce(aggregate_plays.count, 0) as play_count,
  
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
        select slug 
        from digital_content_routes r
        where
          r.digital_content_id = agreements.digital_content_id
        order by is_current
      ) as routes,
  
      array(
        select user_id 
        from reposts
        where
          is_current = true
          and is_delete = false
          and repost_type = 'digital_content' 
          and repost_item_id = digital_content_id
        order by created_at desc
      ) as reposted_by,
    
      array(
        select user_id 
        from saves
        where
          is_current = true
          and is_delete = false
          and save_type = 'digital_content' 
          and save_item_id = digital_content_id
        order by created_at desc
      ) as saved_by
    
    from agreements
      join users on owner_id = user_id 
      left join aggregate_user on users.user_id = aggregate_user.user_id
      left join aggregate_plays on agreements.digital_content_id = aggregate_plays.play_item_id
    WHERE agreements.is_current = true 
      AND users.is_current = true
    `
  }

  checkpointSql(checkpoint: BlocknumberCheckpoint): string {
    return `
    and digital_content_id in (
      select digital_content_id from agreements where is_current and blocknumber >= ${checkpoint.agreements}
      union
      select save_item_id from saves where is_current and save_type = 'digital_content' and blocknumber >= ${checkpoint.saves}
      union
      select repost_item_id from reposts where is_current and repost_type = 'digital_content' and blocknumber >= ${checkpoint.reposts}
      union
      select play_item_id FROM plays WHERE created_at > NOW() - INTERVAL '10 minutes'
    )
    `
  }

  withRow(row: AgreementDoc) {
    row.suggest = [row.title, row.user.handle, row.user.name]
      .filter((x) => x)
      .join(' ')
    row.tag_list = splitTags(row.tags)
    row.repost_count = row.reposted_by.length
    row.favorite_count = row.saved_by.length
    row.duration = Math.ceil(
      row.digital_content_segments.reduce((acc, s) => acc + parseFloat(s.duration), 0)
    )
    row.length = row.duration

    // permalink
    const currentRoute = row.routes[row.routes.length - 1]
    row.permalink = `/${row.user.handle}/${currentRoute}`
  }
}
