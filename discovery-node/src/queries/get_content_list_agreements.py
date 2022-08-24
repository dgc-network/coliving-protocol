import logging  # pylint: disable=C0302

import sqlalchemy
from src.models.content_lists.content_list import ContentList
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import add_users_to_agreements, populate_agreement_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def get_content_list_agreements(session, args):
    """Accepts args:
    {
        # optionally pass in full contentLists to avoid having to fetch
        "content_lists": ContentList[]

        # not needed if contentLists are passed
        "content_list_ids": string[]
        "current_user_id": int
        "populate_agreements": boolean # whether to add users & metadata to agreements
    }

    Returns: {
        content_list_id: ContentList
    }
    """

    try:
        contentLists = args.get("content_lists")
        if not contentLists:
            content_list_ids = args.get("content_list_ids", [])
            contentLists = session.query(ContentList).filter(
                ContentList.is_current == True, ContentList.content_list_id.in_(content_list_ids)
            )
            contentLists = list(map(helpers.model_to_dictionary, contentLists))

        if not contentLists:
            return {}

        # agreement_id -> [content_list_id]
        agreement_ids_set = set()
        for contentList in contentLists:
            content_list_id = contentList["content_list_id"]
            for agreement_id_dict in contentList["content_list_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement_ids_set.add(agreement_id)

        content_list_agreements = (
            session.query(Agreement)
            .filter(Agreement.is_current == True, Agreement.agreement_id.in_(list(agreement_ids_set)))
            .all()
        )

        agreements = helpers.query_result_to_list(content_list_agreements)

        if args.get("populate_agreements"):
            current_user_id = args.get("current_user_id")
            agreements = populate_agreement_metadata(
                session, list(agreement_ids_set), agreements, current_user_id
            )

            add_users_to_agreements(session, agreements, current_user_id)

        # { agreement_id => agreement }
        agreement_ids_map = {agreement["agreement_id"]: agreement for agreement in agreements}

        # { content_list_id => [agreement]}
        content_lists_map = {}
        for contentList in contentLists:
            content_list_id = contentList["content_list_id"]
            content_lists_map[content_list_id] = []
            for agreement_id_dict in contentList["content_list_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement = agreement_ids_map[agreement_id]
                content_lists_map[content_list_id].append(agreement)

        return content_lists_map

    except sqlalchemy.orm.exc.NoResultFound:
        return {}
