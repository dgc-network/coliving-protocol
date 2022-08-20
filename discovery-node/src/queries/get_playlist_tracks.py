import logging  # pylint: disable=C0302

import sqlalchemy
from src.models.contentLists.contentList import ContentList
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import add_users_to_agreements, populate_agreement_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def get_contentList_agreements(session, args):
    """Accepts args:
    {
        # optionally pass in full contentLists to avoid having to fetch
        "contentLists": ContentList[]

        # not needed if contentLists are passed
        "contentList_ids": string[]
        "current_user_id": int
        "populate_agreements": boolean # whether to add users & metadata to agreements
    }

    Returns: {
        contentList_id: ContentList
    }
    """

    try:
        contentLists = args.get("contentLists")
        if not contentLists:
            contentList_ids = args.get("contentList_ids", [])
            contentLists = session.query(ContentList).filter(
                ContentList.is_current == True, ContentList.contentList_id.in_(contentList_ids)
            )
            contentLists = list(map(helpers.model_to_dictionary, contentLists))

        if not contentLists:
            return {}

        # agreement_id -> [contentList_id]
        agreement_ids_set = set()
        for contentList in contentLists:
            contentList_id = contentList["contentList_id"]
            for agreement_id_dict in contentList["contentList_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement_ids_set.add(agreement_id)

        contentList_agreements = (
            session.query(Agreement)
            .filter(Agreement.is_current == True, Agreement.agreement_id.in_(list(agreement_ids_set)))
            .all()
        )

        agreements = helpers.query_result_to_list(contentList_agreements)

        if args.get("populate_agreements"):
            current_user_id = args.get("current_user_id")
            agreements = populate_agreement_metadata(
                session, list(agreement_ids_set), agreements, current_user_id
            )

            add_users_to_agreements(session, agreements, current_user_id)

        # { agreement_id => agreement }
        agreement_ids_map = {agreement["agreement_id"]: agreement for agreement in agreements}

        # { contentList_id => [agreement]}
        contentLists_map = {}
        for contentList in contentLists:
            contentList_id = contentList["contentList_id"]
            contentLists_map[contentList_id] = []
            for agreement_id_dict in contentList["contentList_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement = agreement_ids_map[agreement_id]
                contentLists_map[contentList_id].append(agreement)

        return contentLists_map

    except sqlalchemy.orm.exc.NoResultFound:
        return {}
