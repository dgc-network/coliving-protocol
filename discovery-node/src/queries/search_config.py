import logging

# Global

# Threshold for lexeme similarity, in [0, 1].
# Lower values are slower and match more rows, higher values are quicker
# but may exclude viable candidates.
min_search_similarity = 0.4

# ContentList and Agreement Search Weights

# Weight for query similarity against title
search_title_weight = 12
# Weight for query similarity to words in agreement title (summed)
search_similarity_weight = 5
# Weight for query similarity to agreement owner's username
search_user_name_weight = 8
# Weight for agreement reposts.
search_repost_weight = 15
search_title_exact_match_boost = 20
search_handle_exact_match_boost = 15
search_user_name_exact_match_boost = 5

# Weight for entities that have been saved by a user
current_user_saved_match_boost = 30

# Users

# Weight for similarity between query and user name
user_name_weight = 0.7
# Weight for user follower count (logged)
user_follower_weight = 0.5
# Boost for exact handle match
user_handle_exact_match_boost = 10

logger = logging.getLogger(__name__)


def set_search_similarity(cursor):
    """
    Sets the search similarity threshold to be used by % operator in queries.
    https://www.postgresql.org/docs/9.6/pgtrgm.html

    Note: set_limit was replaced by pg_trgm.similarity_threshold in PG 9.6.
    https://stackoverflow.com/a/11250001/11435157
    """
    try:
        cursor.execute(f"SET pg_trgm.similarity_threshold = {min_search_similarity}")
    except Exception as e:
        logger.error(f"Unable to set similarity_threshold: {e}")
