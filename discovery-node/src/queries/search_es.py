import logging
from typing import Any, Dict, Optional

from src.api.v1.helpers import (
    extend_favorite,
    extend_content_list,
    extend_repost,
    extend_agreement,
    extend_user,
)
from src.queries.get_feed_es import fetch_followed_saves_and_reposts, item_key
from src.utils.elasticdsl import (
    ES_CONTENT_LISTS,
    ES_AGREEMENTS,
    ES_USERS,
    esclient,
    pluck_hits,
    populate_agreement_or_content_list_metadata_es,
    populate_user_metadata_es,
)

logger = logging.getLogger(__name__)


def search_es_full(args: dict):
    if not esclient:
        raise Exception("esclient is None")

    search_str = args.get("query")
    current_user_id = args.get("current_user_id")
    limit = args.get("limit", 10)
    offset = args.get("offset", 0)
    search_type = args.get("kind", "all")
    only_downloadable = args.get("only_downloadable")
    is_auto_complete = args.get("is_auto_complete")
    do_agreements = search_type == "all" or search_type == "agreements"
    do_users = search_type == "all" or search_type == "users"
    do_content_lists = search_type == "all" or search_type == "content_lists"
    do_albums = search_type == "all" or search_type == "albums"

    mdsl: Any = []

    # Scoring Summary
    # Query score * Function score multiplier
    # Query score = boosted on text similarity, verified landlords, personalization (current user saved or reposted or followed)
    # Function score multiplier = popularity (repost count)

    # agreements
    if do_agreements:
        mdsl.extend(
            [
                {"index": ES_AGREEMENTS},
                agreement_dsl(
                    search_str,
                    current_user_id,
                    must_saved=False,
                    only_downloadable=only_downloadable,
                ),
            ]
        )

        # saved agreements
        if current_user_id:
            mdsl.extend(
                [
                    {"index": ES_AGREEMENTS},
                    agreement_dsl(
                        search_str,
                        current_user_id,
                        must_saved=True,
                        only_downloadable=only_downloadable,
                    ),
                ]
            )

    # users
    if do_users:
        mdsl.extend(
            [
                {"index": ES_USERS},
                user_dsl(search_str, current_user_id),
            ]
        )
        if current_user_id:
            mdsl.extend(
                [
                    {"index": ES_USERS},
                    user_dsl(search_str, current_user_id, True),
                ]
            )

    # contentLists
    if do_content_lists:
        mdsl.extend(
            [
                {"index": ES_CONTENT_LISTS},
                content_list_dsl(search_str, current_user_id),
            ]
        )

        # saved contentLists
        if current_user_id:
            mdsl.extend(
                [
                    {"index": ES_CONTENT_LISTS},
                    content_list_dsl(search_str, current_user_id, True),
                ]
            )

    # albums
    if do_albums:
        mdsl.extend(
            [
                {"index": ES_CONTENT_LISTS},
                album_dsl(search_str, current_user_id),
            ]
        )
        # saved albums
        if current_user_id:
            mdsl.extend(
                [
                    {"index": ES_CONTENT_LISTS},
                    album_dsl(search_str, current_user_id, True),
                ]
            )

    mdsl_limit_offset(mdsl, limit, offset)
    mfound = esclient.msearch(searches=mdsl)

    response: Dict = {
        "agreements": [],
        "saved_agreements": [],
        "users": [],
        "followed_users": [],
        "content_lists": [],
        "saved_content_lists": [],
        "albums": [],
        "saved_albums": [],
    }

    if do_agreements:
        response["agreements"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["saved_agreements"] = pluck_hits(mfound["responses"].pop(0))

    if do_users:
        response["users"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["followed_users"] = pluck_hits(mfound["responses"].pop(0))

    if do_content_lists:
        response["content_lists"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["saved_content_lists"] = pluck_hits(mfound["responses"].pop(0))

    if do_albums:
        response["albums"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["saved_albums"] = pluck_hits(mfound["responses"].pop(0))

    finalize_response(
        response, limit, current_user_id, is_auto_complete=is_auto_complete
    )
    return response


def search_tags_es(q: str, kind="all", current_user_id=None, limit=0, offset=0):
    if not esclient:
        raise Exception("esclient is None")

    do_agreements = kind == "all" or kind == "agreements"
    do_users = kind == "all" or kind == "users"
    mdsl: Any = []

    def tag_match(fieldname):
        match = {
            "query": {
                "bool": {
                    "must": [{"match": {fieldname: {"query": q}}}],
                    "must_not": [],
                    "should": [],
                }
            }
        }
        return match

    if do_agreements:
        mdsl.extend([{"index": ES_AGREEMENTS}, tag_match("tag_list")])
        if current_user_id:
            dsl = tag_match("tag_list")
            dsl["query"]["bool"]["must"].append(be_saved(current_user_id))
            mdsl.extend([{"index": ES_AGREEMENTS}, dsl])

    if do_users:
        mdsl.extend([{"index": ES_USERS}, tag_match("agreements.tags")])
        if current_user_id:
            dsl = tag_match("agreements.tags")
            dsl["query"]["bool"]["must"].append(be_followed(current_user_id))
            mdsl.extend([{"index": ES_USERS}, dsl])

    mdsl_limit_offset(mdsl, limit, offset)
    mfound = esclient.msearch(searches=mdsl)

    response: Dict = {
        "agreements": [],
        "saved_agreements": [],
        "users": [],
        "followed_users": [],
    }

    if do_agreements:
        response["agreements"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["saved_agreements"] = pluck_hits(mfound["responses"].pop(0))

    if do_users:
        response["users"] = pluck_hits(mfound["responses"].pop(0))
        if current_user_id:
            response["followed_users"] = pluck_hits(mfound["responses"].pop(0))

    finalize_response(response, limit, current_user_id, legacy_mode=True)
    return response


def mdsl_limit_offset(mdsl, limit, offset):
    # add size and limit with some over-fetching
    # for sake of drop_copycats
    index_name = ""
    for dsl in mdsl:
        if "index" in dsl:
            index_name = dsl["index"]
            continue
        dsl["size"] = limit
        dsl["from"] = offset
        if index_name == ES_USERS:
            dsl["size"] = limit + 5


def finalize_response(
    response: Dict,
    limit: int,
    current_user_id: Optional[int],
    legacy_mode=False,
    is_auto_complete=False,
):
    """Hydrates users and contextualizes results for current user (if applicable).
    Also removes extra indexed fields so as to match the fieldset from postgres.

    legacy_mode=True will skip v1 api transforms.
    This is similar to the code in get_feed_es (which does it's own thing,
      but could one day use finalize_response with legacy_mode=True).
    e.g. doesn't encode IDs and populates `followee_saves` instead of `followee_reposts`
    """
    if not esclient:
        raise Exception("esclient is None")

    # hydrate users, saves, reposts
    item_keys = []
    user_ids = set()
    if current_user_id:
        user_ids.add(current_user_id)

    # collect keys for fetching
    for items in response.values():
        for item in items:
            item_keys.append(item_key(item))
            user_ids.add(item.get("owner_id", item.get("content_list_owner_id")))

    # fetch users
    users_by_id = {}
    current_user = None

    if user_ids:
        ids = [str(id) for id in user_ids]
        users_mget = esclient.mget(index=ES_USERS, ids=ids)
        users_by_id = {d["_id"]: d["_source"] for d in users_mget["docs"] if d["found"]}
        if current_user_id:
            current_user = users_by_id.get(str(current_user_id))
        for id, user in users_by_id.items():
            users_by_id[id] = populate_user_metadata_es(user, current_user)

    # fetch followed saves + reposts
    # TODO: instead of limit param (20) should do an agg to get 3 saves / reposts per item_key
    if not is_auto_complete:
        (follow_saves, follow_reposts) = fetch_followed_saves_and_reposts(
            current_user_id, item_keys, 20
        )

    # agreements: finalize
    for k in ["agreements", "saved_agreements"]:
        agreements = response[k]
        hydrate_user(agreements, users_by_id)
        if not is_auto_complete:
            hydrate_saves_reposts(agreements, follow_saves, follow_reposts, legacy_mode)
        response[k] = [map_agreement(agreement, current_user, legacy_mode) for agreement in agreements]

    # users: finalize
    for k in ["users", "followed_users"]:
        users = drop_copycats(response[k])
        users = users[:limit]
        response[k] = [map_user(user, current_user, legacy_mode) for user in users]

    # contentLists: finalize
    for k in ["content_lists", "saved_content_lists", "albums", "saved_albums"]:
        if k not in response:
            continue
        contentLists = response[k]
        if not is_auto_complete:
            hydrate_saves_reposts(contentLists, follow_saves, follow_reposts, legacy_mode)
        hydrate_user(contentLists, users_by_id)
        response[k] = [
            map_content_list(contentList, current_user, legacy_mode) for contentList in contentLists
        ]

    return response


def base_match(search_str: str, operator="or"):
    return [
        {
            "multi_match": {
                "query": search_str,
                "fields": [
                    "suggest",
                    "suggest._2gram",
                    "suggest._3gram",
                ],
                "operator": operator,
                "type": "bool_prefix",
                "fuzziness": "AUTO",
            }
        }
    ]


def be_saved(current_user_id):
    return {"term": {"saved_by": {"value": current_user_id, "boost": 1.2}}}


def be_reposted(current_user_id):
    return {"term": {"reposted_by": {"value": current_user_id, "boost": 1.2}}}


def be_followed(current_user_id):
    return {
        "terms": {
            "_id": {
                "index": ES_USERS,
                "id": str(current_user_id),
                "path": "following_ids",
            },
        }
    }


def personalize_dsl(dsl, current_user_id, must_saved):
    if current_user_id and must_saved:
        dsl["must"].append(be_saved(current_user_id))

    if current_user_id:
        dsl["should"].append(be_saved(current_user_id))
        dsl["should"].append(be_reposted(current_user_id))


def default_function_score(dsl, ranking_field):
    return {
        "query": {
            "script_score": {
                "query": {"bool": dsl},
                "script": {
                    "source": f"_score * Math.log(Math.max(doc['{ranking_field}'].value, 0) + 2)"
                },
            }
        },
    }


def agreement_dsl(search_str, current_user_id, must_saved=False, only_downloadable=False):
    dsl = {
        "must": [
            *base_match(search_str),
            {"term": {"is_unlisted": {"value": False}}},
            {"term": {"is_delete": False}},
        ],
        "must_not": [
            {"exists": {"field": "stem_of"}},
        ],
        "should": [
            *base_match(search_str, operator="and"),
        ],
    }

    if only_downloadable:
        dsl["must"].append({"term": {"downloadable": {"value": True}}})

    personalize_dsl(dsl, current_user_id, must_saved)
    return default_function_score(dsl, "repost_count")


def user_dsl(search_str, current_user_id, must_saved=False):
    dsl = {
        "must": [
            *base_match(search_str),
            {"term": {"is_deactivated": {"value": False}}},
        ],
        "must_not": [],
        "should": [
            *base_match(search_str, operator="and"),
            {"term": {"is_verified": {"value": True}}},
        ],
    }

    if current_user_id and must_saved:
        dsl["must"].append(be_followed(current_user_id))

    if current_user_id:
        dsl["should"].append(be_followed(current_user_id))

    return default_function_score(dsl, "follower_count")


def base_content_list_dsl(search_str, is_album):
    return {
        "must": [
            *base_match(search_str),
            {"term": {"is_private": {"value": False}}},
            {"term": {"is_delete": False}},
            {"term": {"is_album": {"value": is_album}}},
        ],
        "should": [
            *base_match(search_str, operator="and"),
            {"term": {"is_verified": {"value": True}}},
        ],
    }


def content_list_dsl(search_str, current_user_id, must_saved=False):
    dsl = base_content_list_dsl(search_str, False)
    personalize_dsl(dsl, current_user_id, must_saved)
    return default_function_score(dsl, "repost_count")


def album_dsl(search_str, current_user_id, must_saved=False):
    dsl = base_content_list_dsl(search_str, True)
    personalize_dsl(dsl, current_user_id, must_saved)
    return default_function_score(dsl, "repost_count")


def drop_copycats(users):
    """Filters out users with copy cat names.
    e.g. if a verified deadmau5 is in the result set
    filter out all non-verified users with same name.
    """
    reserved = set()
    for user in users:
        if user["is_verified"]:
            reserved.add(lower_ascii_name(user["name"]))

    filtered = []
    for user in users:
        if not user["is_verified"] and lower_ascii_name(user["name"]) in reserved:
            continue
        filtered.append(user)
    return filtered


def lower_ascii_name(name):
    if not name:
        return ""
    n = name.lower()
    n = n.encode("ascii", "ignore")
    return n.decode()


def hydrate_user(items, users_by_id):
    for item in items:
        uid = str(item.get("owner_id", item.get("content_list_owner_id")))
        user = users_by_id.get(uid)
        if user:
            item["user"] = user


def hydrate_saves_reposts(items, follow_saves, follow_reposts, legacy_mode):
    for item in items:
        ik = item_key(item)
        if legacy_mode:
            item["followee_reposts"] = follow_reposts[ik]
            item["followee_saves"] = follow_saves[ik]
        else:
            item["followee_reposts"] = [extend_repost(r) for r in follow_reposts[ik]]
            item["followee_favorites"] = [extend_favorite(x) for x in follow_saves[ik]]


def map_user(user, current_user, legacy_mode):
    user = populate_user_metadata_es(user, current_user)
    if not legacy_mode:
        user = extend_user(user)
    return user


def map_agreement(agreement, current_user, legacy_mode):
    agreement = populate_agreement_or_content_list_metadata_es(agreement, current_user)
    if not legacy_mode:
        agreement = extend_agreement(agreement)
    return agreement


def map_content_list(contentList, current_user, legacy_mode):
    contentList = populate_agreement_or_content_list_metadata_es(contentList, current_user)
    if not legacy_mode:
        contentList = extend_content_list(contentList)
    return contentList
