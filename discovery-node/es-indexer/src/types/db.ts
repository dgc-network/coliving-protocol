/*
* This file was generated by a tool.
* Rerun sql-ts to regenerate this file.
*/
export interface AggregateDailyAppNameMetricRow {
  'application_name': string;
  'count': number;
  'created_at': Date;
  'id'?: number;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateDailyTotalUsersMetricRow {
  'count': number;
  'created_at': Date;
  'id'?: number;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateDailyUniqueUsersMetricRow {
  'count': number;
  'created_at': Date;
  'id'?: number;
  'summed_count'?: number | null;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateIntervalPlayRow {
  'created_at'?: Date | null;
  'genre'?: string | null;
  'month_listen_counts'?: string | null;
  'digital_content_id'?: number | null;
  'week_listen_counts'?: string | null;
}
export interface AggregateMonthlyAppNameMetricRow {
  'application_name': string;
  'count': number;
  'created_at': Date;
  'id'?: number;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateMonthlyPlayRow {
  'count': number;
  'play_item_id': number;
  'timestamp': Date;
}
export interface AggregateMonthlyTotalUsersMetricRow {
  'count': number;
  'created_at': Date;
  'id'?: number;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateMonthlyUniqueUsersMetricRow {
  'count': number;
  'created_at': Date;
  'id'?: number;
  'summed_count'?: number | null;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AggregateContentListRow {
  'is_album'?: boolean | null;
  'content_list_id'?: number | null;
  'repost_count'?: string | null;
  'save_count'?: string | null;
}
export interface AggregatePlayRow {
  'count'?: string | null;
  'play_item_id'?: number | null;
}
export interface AggregateAgreementRow {
  'repost_count': number;
  'save_count': number;
  'digital_content_id': number;
}
export interface AggregateUserRow {
  'album_count'?: string | null;
  'follower_count'?: string | null;
  'following_count'?: string | null;
  'content_list_count'?: string | null;
  'repost_count'?: string | null;
  'supporter_count'?: number;
  'supporting_count'?: number;
  'digital_content_count'?: string | null;
  'digital_content_save_count'?: string | null;
  'user_id': number;
}
export interface AggregateUserTipRow {
  'amount': string;
  'receiver_user_id': number;
  'sender_user_id': number;
}
export interface AlbumLexemeDictRow {
  'handle'?: string | null;
  'owner_id'?: number | null;
  'content_list_id'?: number | null;
  'content_list_name'?: string | null;
  'repost_count'?: string | null;
  'row_number'?: string | null;
  'user_name'?: string | null;
  'word'?: string | null;
}
export interface AlembicVersionRow {
  'version_num': string;
}
export interface AppNameMetricRow {
  'application_name': string;
  'count': number;
  'created_at': Date;
  'id'?: string;
  'ip'?: string | null;
  'timestamp': Date;
  'updated_at': Date;
}
export interface AppNameMetricsAllTimeRow {
  'count'?: string | null;
  'name'?: string | null;
}
export interface AppNameMetricsTrailingMonthRow {
  'count'?: string | null;
  'name'?: string | null;
}
export interface AppNameMetricsTrailingWeekRow {
  'count'?: string | null;
  'name'?: string | null;
}
export interface AssociatedWalletRow {
  'blockhash': string;
  'blocknumber': number;
  'chain': wallet_chain;
  'id'?: number;
  'is_current': boolean;
  'is_delete': boolean;
  'user_id': number;
  'wallet': string;
}
export interface ColivingDataTxRow {
  'signature': string;
  'slot': number;
}
export interface BlockRow {
  'blockhash': string;
  'is_current'?: boolean | null;
  'number'?: number | null;
  'parenthash'?: string | null;
}
export interface BlocksCopyRow {
  'blockhash': string;
  'is_current'?: boolean | null;
  'number'?: number | null;
  'parenthash'?: string | null;
}
export interface ChallengeDisbursementRow {
  'amount': string;
  'challenge_id': string;
  'signature': string;
  'slot': number;
  'specifier': string;
  'user_id': number;
}
export interface ChallengeListenStreakRow {
  'last_listen_date'?: Date | null;
  'listen_streak': number;
  'user_id'?: number;
}
export interface ChallengeProfileCompletionRow {
  'favorites': boolean;
  'follows': boolean;
  'profile_cover_photo': boolean;
  'profile_description': boolean;
  'profile_name': boolean;
  'profile_picture': boolean;
  'reposts': boolean;
  'user_id'?: number;
}
export interface ChallengeRow {
  'active': boolean;
  'amount': string;
  'id': string;
  'starting_block'?: number | null;
  'step_count'?: number | null;
  'type': challengetype;
}
export interface EthBlockRow {
  'created_at': Date;
  'last_scanned_block'?: number;
  'updated_at': Date;
}
export interface FollowRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'created_at': Date;
  'followee_user_id': number;
  'follower_user_id': number;
  'is_current': boolean;
  'is_delete': boolean;
  'slot'?: number | null;
  'txhash'?: string;
}
export interface HourlyPlayCountRow {
  'hourly_timestamp': Date;
  'play_count': number;
}
export interface IndexingCheckpointRow {
  'last_checkpoint': number;
  'tablename': string;
}
export interface MilestoneRow {
  'blocknumber'?: number | null;
  'id': number;
  'name': string;
  'slot'?: number | null;
  'threshold': number;
  'timestamp': Date;
}
export interface PgStatStatementRow {
  'blk_read_time'?: number | null;
  'blk_write_time'?: number | null;
  'calls'?: string | null;
  'dbid'?: any | null;
  'local_blks_dirtied'?: string | null;
  'local_blks_hit'?: string | null;
  'local_blks_read'?: string | null;
  'local_blks_written'?: string | null;
  'max_time'?: number | null;
  'mean_time'?: number | null;
  'min_time'?: number | null;
  'query'?: string | null;
  'queryid'?: string | null;
  'rows'?: string | null;
  'shared_blks_dirtied'?: string | null;
  'shared_blks_hit'?: string | null;
  'shared_blks_read'?: string | null;
  'shared_blks_written'?: string | null;
  'stddev_time'?: number | null;
  'temp_blks_read'?: string | null;
  'temp_blks_written'?: string | null;
  'total_time'?: number | null;
  'userid'?: any | null;
}
export interface ContentListLexemeDictRow {
  'handle'?: string | null;
  'owner_id'?: number | null;
  'content_list_id'?: number | null;
  'content_list_name'?: string | null;
  'repost_count'?: string | null;
  'row_number'?: string | null;
  'user_name'?: string | null;
  'word'?: string | null;
}
export interface ContentListRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'created_at': Date;
  'description'?: string | null;
  'is_album': boolean;
  'is_current': boolean;
  'is_delete': boolean;
  'is_private': boolean;
  'last_added_to'?: Date | null;
  'content_list_contents': any;
  'content_list_id': number;
  'content_list_image_multihash'?: string | null;
  'content_list_image_sizes_multihash'?: string | null;
  'content_list_name'?: string | null;
  'content_list_owner_id': number;
  'slot'?: number | null;
  'txhash'?: string;
  'upc'?: string | null;
  'updated_at': Date;
}
export interface PlayRow {
  'created_at': Date;
  'id'?: number;
  'play_item_id': number;
  'signature'?: string | null;
  'slot'?: number | null;
  'source'?: string | null;
  'updated_at': Date;
  'user_id'?: number | null;
}
export interface PlaysArchiveRow {
  'archived_at'?: Date | null;
  'created_at': Date;
  'id': number;
  'play_item_id': number;
  'signature'?: string | null;
  'slot'?: number | null;
  'source'?: string | null;
  'updated_at': Date;
  'user_id'?: number | null;
}
export interface ReactionRow {
  'id'?: number;
  'reacted_to': string;
  'reaction_type': string;
  'reaction_value': number;
  'sender_wallet': string;
  'slot': number;
  'timestamp': Date;
  'tx_signature'?: string | null;
}
export interface RelatedLandlordRow {
  'created_at': Date;
  'related_landlord_user_id': number;
  'score': number;
  'user_id': number;
}
export interface RemixeRow {
  'child_digital_content_id': number;
  'parent_digital_content_id': number;
}
export interface RepostRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'created_at': Date;
  'is_current': boolean;
  'is_delete': boolean;
  'repost_item_id': number;
  'repost_type': reposttype;
  'slot'?: number | null;
  'txhash'?: string;
  'user_id': number;
}
export interface RewardManagerTxRow {
  'created_at': Date;
  'signature': string;
  'slot': number;
}
export interface RouteMetricRow {
  'count': number;
  'created_at': Date;
  'id'?: string;
  'ip'?: string | null;
  'query_string': string;
  'route_path': string;
  'timestamp': Date;
  'updated_at': Date;
  'version': string;
}
export interface RouteMetricsAllTimeRow {
  'count'?: string | null;
  'unique_count'?: string | null;
}
export interface RouteMetricsDayBucketRow {
  'count'?: string | null;
  'time'?: Date | null;
  'unique_count'?: string | null;
}
export interface RouteMetricsMonthBucketRow {
  'count'?: string | null;
  'time'?: Date | null;
  'unique_count'?: string | null;
}
export interface RouteMetricsTrailingMonthRow {
  'count'?: string | null;
  'unique_count'?: string | null;
}
export interface RouteMetricsTrailingWeekRow {
  'count'?: string | null;
  'unique_count'?: string | null;
}
export interface SaveRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'created_at': Date;
  'is_current': boolean;
  'is_delete': boolean;
  'save_item_id': number;
  'save_type': savetype;
  'slot'?: number | null;
  'txhash'?: string;
  'user_id': number;
}
export interface SkippedTransactionRow {
  'blockhash': string;
  'blocknumber': number;
  'created_at': Date;
  'id'?: number;
  'level': skippedtransactionlevel;
  'txhash': string;
  'updated_at': Date;
}
export interface SplTokenTxRow {
  'created_at'?: Date;
  'last_scanned_slot': number;
  'signature': string;
  'updated_at'?: Date;
}
export interface StemRow {
  'child_digital_content_id': number;
  'parent_digital_content_id': number;
}
export interface SupporterRankUpRow {
  'rank': number;
  'receiver_user_id': number;
  'sender_user_id': number;
  'slot': number;
}
export interface TagAgreementUserRow {
  'owner_id'?: number | null;
  'tag'?: string | null;
  'digital_content_id'?: number | null;
}
export interface AgreementLexemeDictRow {
  'handle'?: string | null;
  'owner_id'?: number | null;
  'repost_count'?: number | null;
  'row_number'?: string | null;
  'digital_content_id'?: number | null;
  'digital_content_title'?: string | null;
  'user_name'?: string | null;
  'word'?: string | null;
}
export interface AgreementRouteRow {
  'blockhash': string;
  'blocknumber': number;
  'collision_id': number;
  'is_current': boolean;
  'owner_id': number;
  'slug': string;
  'title_slug': string;
  'digital_content_id': number;
  'txhash': string;
}
export interface AgreementTrendingScoreRow {
  'created_at': Date;
  'genre'?: string | null;
  'score': number;
  'time_range': string;
  'digital_content_id': number;
  'type': string;
  'version': string;
}
export interface AgreementRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'cover_art'?: string | null;
  'cover_art_sizes'?: string | null;
  'create_date'?: string | null;
  'created_at': Date;
  'credits_splits'?: string | null;
  'description'?: string | null;
  'download'?: any | null;
  'field_visibility'?: any | null;
  'file_type'?: string | null;
  'genre'?: string | null;
  'is_current': boolean;
  'is_delete': boolean;
  'is_unlisted'?: boolean;
  'isrc'?: string | null;
  'iswc'?: string | null;
  'length'?: number | null;
  'license'?: string | null;
  'metadata_multihash'?: string | null;
  'mood'?: string | null;
  'owner_id': number;
  'release_date'?: string | null;
  'remix_of'?: any | null;
  'route_id'?: string | null;
  'slot'?: number | null;
  'stem_of'?: any | null;
  'tags'?: string | null;
  'title'?: string | null;
  'digital_content_id': number;
  'digital_content_segments': any;
  'txhash'?: string;
  'updated_at': Date;
}
export interface TrendingParamRow {
  'genre'?: string | null;
  'karma'?: string | null;
  'owner_follower_count'?: string | null;
  'owner_id'?: number | null;
  'play_count'?: string | null;
  'repost_count'?: number | null;
  'repost_month_count'?: string | null;
  'repost_week_count'?: string | null;
  'repost_year_count'?: string | null;
  'save_count'?: number | null;
  'save_month_count'?: string | null;
  'save_week_count'?: string | null;
  'save_year_count'?: string | null;
  'digital_content_id'?: number | null;
}
export interface TrendingResultRow {
  'id'?: string | null;
  'rank': number;
  'type': string;
  'user_id': number;
  'version': string;
  'week': Date;
}
export interface UrsmContentNodeRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'cnode_sp_id': number;
  'created_at': Date;
  'delegate_owner_wallet': string;
  'endpoint'?: string | null;
  'is_current': boolean;
  'owner_wallet': string;
  'proposer_1_delegate_owner_wallet': string;
  'proposer_2_delegate_owner_wallet': string;
  'proposer_3_delegate_owner_wallet': string;
  'proposer_sp_ids': any;
  'slot'?: number | null;
  'txhash'?: string;
}
export interface UserBalanceChangeRow {
  'blocknumber': number;
  'created_at': Date;
  'current_balance': string;
  'previous_balance': string;
  'updated_at': Date;
  'user_id'?: number;
}
export interface UserBalanceRow {
  'associated_sol_wallets_balance'?: string;
  'associated_wallets_balance'?: string;
  'balance': string;
  'created_at': Date;
  'updated_at': Date;
  'user_id'?: number;
  'wlive'?: string | null;
}
export interface UserBankAccountRow {
  'bank_account': string;
  'created_at': Date;
  'ethereum_address': string;
  'signature': string;
}
export interface UserBankTxRow {
  'created_at': Date;
  'signature': string;
  'slot': number;
}
export interface UserChallengeRow {
  'challenge_id': string;
  'completed_blocknumber'?: number | null;
  'current_step_count'?: number | null;
  'is_complete': boolean;
  'specifier': string;
  'user_id': number;
}
export interface UserEventRow {
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'id'?: number;
  'is_current': boolean;
  'is_mobile_user': boolean;
  'referrer'?: number | null;
  'slot'?: number | null;
  'user_id': number;
}
export interface UserLexemeDictRow {
  'follower_count'?: string | null;
  'handle'?: string | null;
  'row_number'?: string | null;
  'user_id'?: number | null;
  'user_name'?: string | null;
  'word'?: string | null;
}
export interface UserListeningHistoryRow {
  'listening_history': any;
  'user_id'?: number;
}
export interface UserTipRow {
  'amount': string;
  'created_at': Date;
  'receiver_user_id': number;
  'sender_user_id': number;
  'signature': string;
  'slot': number;
  'updated_at'?: Date;
}
export interface UserRow {
  'bio'?: string | null;
  'blockhash'?: string | null;
  'blocknumber'?: number | null;
  'cover_photo'?: string | null;
  'cover_photo_sizes'?: string | null;
  'created_at': Date;
  'content_node_endpoint'?: string | null;
  'handle'?: string | null;
  'handle_lc'?: string | null;
  'has_collectibles'?: boolean;
  'is_current': boolean;
  'is_deactivated'?: boolean;
  'is_verified'?: boolean;
  'location'?: string | null;
  'metadata_multihash'?: string | null;
  'name'?: string | null;
  'content_list_library'?: any | null;
  'primary_id'?: number | null;
  'profile_picture'?: string | null;
  'profile_picture_sizes'?: string | null;
  'replica_set_update_signer'?: string | null;
  'secondary_ids'?: any | null;
  'slot'?: number | null;
  'txhash'?: string;
  'updated_at': Date;
  'user_authority_account'?: string | null;
  'user_id': number;
  'user_storage_account'?: string | null;
  'wallet'?: string | null;
}
export enum wallet_chain {
  'eth' = 'eth',
  'sol' = 'sol',
}
export enum skippedtransactionlevel {
  'node' = 'node',
  'network' = 'network',
}
export enum savetype {
  'digital_content' = 'digital_content',
  'contentList' = 'contentList',
  'album' = 'album',
}
export enum reposttype {
  'digital_content' = 'digital_content',
  'contentList' = 'contentList',
  'album' = 'album',
}
export enum challengetype {
  'boolean' = 'boolean',
  'numeric' = 'numeric',
  'aggregate' = 'aggregate',
  'trending' = 'trending',
}
