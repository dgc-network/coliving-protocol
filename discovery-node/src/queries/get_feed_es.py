from collections import defaultdict

from src.queries.query_helpers import get_users_ids
from src.utils.elasticdsl import (
    ES_CONTENT_LISTS,
    ES_REPOSTS,
    ES_SAVES,
    ES_AGREEMENTS,
    ES_USERS,
    esclient,
    pluck_hits,
    populate_agreement_or_content_list_metadata_es,
    populate_user_metadata_es,
)


def get_feed_es(args, limit=10):
    current_user_id = str(args.get("user_id"))
    feed_filter = args.get("filter", "all")
    load_reposts = feed_filter in ["repost", "all"]
    load_orig = feed_filter in ["original", "all"]

    mdsl = []

    if load_reposts:
        mdsl.extend(
            [
                {"index": ES_REPOSTS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(current_user_id, "user_id"),
                                {"term": {"is_delete": False}},
                                {"range": {"created_at": {"gte": "now-30d"}}},
                            ]
                        }
                    },
                    # here doing some over-fetching to de-dupe later
                    # to approximate min_created_at + group by in SQL.
                    "size": 0,
                    "aggs": {
                        "item_key": {
                            "terms": {"field": "item_key", "size": 500},
                            "aggs": {
                                "min_created_at": {"min": {"field": "created_at"}}
                            },
                        }
                    },
                },
            ]
        )

    if load_orig:
        mdsl.extend(
            [
                {"index": ES_AGREEMENTS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(current_user_id, "owner_id"),
                                {"term": {"is_unlisted": False}},
                                {"term": {"is_delete": False}},
                            ],
                            "must_not": [{"exists": {"field": "stem_of"}}],
                        }
                    },
                    "size": limit,
                    "sort": {"created_at": "desc"},
                },
                {"index": ES_CONTENT_LISTS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(
                                    current_user_id, "content_list_owner_id"
                                ),
                                {"term": {"is_private": False}},
                                {"term": {"is_delete": False}},
                            ]
                        }
                    },
                    "size": limit,
                    "sort": {"created_at": "desc"},
                },
            ]
        )

    repost_agg = []
    agreements = []
    contentLists = []

    founds = esclient.msearch(searches=mdsl)

    if load_reposts:
        repost_agg = founds["responses"].pop(0)
        repost_agg = repost_agg["aggregations"]["item_key"]["buckets"]
        for bucket in repost_agg:
            bucket["created_at"] = bucket["min_created_at"]["value_as_string"]
            bucket["item_key"] = bucket["key"]
        repost_agg.sort(key=lambda b: b["min_created_at"]["value"])

    if load_orig:
        agreements = pluck_hits(founds["responses"].pop(0))
        contentLists = pluck_hits(founds["responses"].pop(0))

    # agreement timestamps and duplicates
    seen = set()
    unsorted_feed = []

    for contentList in contentLists:
        # Q: should es-indexer set item_key on agreement / contentList too?
        #    instead of doing it dynamically here?
        contentList["item_key"] = item_key(contentList)
        seen.add(contentList["item_key"])
        # Q: should we add contentList agreements to seen?
        #    get_feed will "debounce" agreements in contentList
        unsorted_feed.append(contentList)

    for agreement in agreements:
        agreement["item_key"] = item_key(agreement)
        seen.add(agreement["item_key"])
        unsorted_feed.append(agreement)

    # remove duplicates from repost feed
    for r in repost_agg:
        k = r["key"]
        if k in seen:
            continue
        seen.add(k)
        unsorted_feed.append(r)

    # sorted feed with repost records
    # the repost records are stubs that we'll now "hydrate"
    # with the related agreement / contentList
    sorted_with_reposts = sorted(
        unsorted_feed,
        key=lambda entry: entry["created_at"],
        reverse=True,
    )

    # take a "soft limit" here.  Some agreements / reposts might get filtered out below
    # if is_delete
    sorted_with_reposts = sorted_with_reposts[0 : limit * 2]

    mget_reposts = []
    keyed_reposts = {}

    # hydrate repost stubs (agg bucket results)
    # min_created_at indicates a repost stub
    for r in sorted_with_reposts:
        if "min_created_at" not in r:
            continue
        (kind, id) = r["key"].split(":")
        if kind == "agreement":
            mget_reposts.append({"_index": ES_AGREEMENTS, "_id": id})
        else:
            mget_reposts.append({"_index": ES_CONTENT_LISTS, "_id": id})

    if mget_reposts:
        reposted_docs = esclient.mget(docs=mget_reposts)
        for doc in reposted_docs["docs"]:
            if not doc["found"]:
                # MISSING: a repost for a agreement or contentList not in the index?
                # this should only happen if repost indexing is running ahead of agreement / contentList
                # should be transient... but should maybe still be agreemented?
                continue
            s = doc["_source"]
            s["item_key"] = item_key(s)
            if (
                s.get("is_delete")
                or s.get("is_private")
                or s.get("is_unlisted")
                or s.get("stem_of")
            ):
                # MISSING: skip reposts for delete, private, unlisted, stem_of
                # this is why we took soft limit above
                continue
            keyed_reposts[s["item_key"]] = s

    # replace repost with underlying items
    sorted_feed = []
    for x in sorted_with_reposts:
        if "min_created_at" not in x:
            x["activity_timestamp"] = x["created_at"]
            sorted_feed.append(x)
        else:
            k = x["key"]
            if k not in keyed_reposts:
                # MISSING: see above
                continue
            item = keyed_reposts[k]
            item["activity_timestamp"] = x["min_created_at"]["value_as_string"]
            sorted_feed.append(item)

    # attach users
    user_id_list = [str(id) for id in get_users_ids(sorted_feed)]
    user_id_list.append(current_user_id)
    user_list = esclient.mget(index=ES_USERS, ids=user_id_list)
    user_by_id = {d["_id"]: d["_source"] for d in user_list["docs"] if d["found"]}

    # populate_user_metadata_es:
    current_user = user_by_id.pop(str(current_user_id))
    for id, user in user_by_id.items():
        user_by_id[id] = populate_user_metadata_es(user, current_user)

    for item in sorted_feed:
        # GOTCHA: es ids must be strings, but our ids are ints...
        uid = str(item.get("content_list_owner_id", item.get("owner_id")))
        item["user"] = user_by_id[uid]

    # add context: followee_reposts, followee_saves
    # currently this over-fetches because there is no per-item grouping
    # really it should use an aggregation with top hits
    # to bucket ~3 saves / reposts per item
    item_keys = [i["item_key"] for i in sorted_feed]

    (follow_saves, follow_reposts) = fetch_followed_saves_and_reposts(
        current_user_id, item_keys, limit * 20
    )

    for item in sorted_feed:
        item["followee_reposts"] = follow_reposts[item["item_key"]]
        item["followee_saves"] = follow_saves[item["item_key"]]

    # populate metadata + remove extra fields from items
    sorted_feed = [
        populate_agreement_or_content_list_metadata_es(item, current_user)
        for item in sorted_feed
    ]

    return sorted_feed[0:limit]


def following_ids_terms_lookup(current_user_id, field):
    """
    does a "terms lookup" to query a field
    with the user_ids that the current user follows
    """
    return {
        "terms": {
            field: {
                "index": ES_USERS,
                "id": str(current_user_id),
                "path": "following_ids",
            },
        }
    }


def fetch_followed_saves_and_reposts(current_user_id, item_keys, limit):
    save_repost_query = {
        "query": {
            "bool": {
                "must": [
                    following_ids_terms_lookup(current_user_id, "user_id"),
                    {"terms": {"item_key": item_keys}},
                    {"term": {"is_delete": False}},
                ]
            }
        },
        "size": limit * 20,  # how much to overfetch?
        "sort": {"created_at": "desc"},
    }
    mdsl = [
        {"index": ES_REPOSTS},
        save_repost_query,
        {"index": ES_SAVES},
        save_repost_query,
    ]

    founds = esclient.msearch(searches=mdsl)
    (reposts, saves) = [pluck_hits(r) for r in founds["responses"]]

    follow_reposts = defaultdict(list)
    follow_saves = defaultdict(list)

    for r in reposts:
        follow_reposts[r["item_key"]].append(r)
    for s in saves:
        follow_saves[s["item_key"]].append(s)

    return (follow_saves, follow_reposts)


def item_key(item):
    if "agreement_id" in item:
        return "agreement:" + str(item["agreement_id"])
    elif "content_list_id" in item:
        if item["is_album"]:
            return "album:" + str(item["content_list_id"])
        return "contentList:" + str(item["content_list_id"])
    elif "user_id" in item:
        return "user:" + str(item["user_id"])
    else:
        raise Exception("item_key unknown type")
