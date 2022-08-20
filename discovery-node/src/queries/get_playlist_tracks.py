import logging  # pylint: disable=C0302

import sqlalchemy
from src.models.content lists.content list import ContentList
from src.models.agreements.agreement import Agreement
from src.queries.query_helpers import add_users_to_agreements, populate_agreement_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def get_content list_agreements(session, args):
    """Accepts args:
    {
        # optionally pass in full content lists to avoid having to fetch
        "content lists": ContentList[]

        # not needed if content lists are passed
        "content list_ids": string[]
        "current_user_id": int
        "populate_agreements": boolean # whether to add users & metadata to agreements
    }

    Returns: {
        content list_id: ContentList
    }
    """

    try:
        content lists = args.get("content lists")
        if not content lists:
            content list_ids = args.get("content list_ids", [])
            content lists = session.query(ContentList).filter(
                ContentList.is_current == True, ContentList.content list_id.in_(content list_ids)
            )
            content lists = list(map(helpers.model_to_dictionary, content lists))

        if not content lists:
            return {}

        # agreement_id -> [content list_id]
        agreement_ids_set = set()
        for content list in content lists:
            content list_id = content list["content list_id"]
            for agreement_id_dict in content list["content list_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement_ids_set.add(agreement_id)

        content list_agreements = (
            session.query(Agreement)
            .filter(Agreement.is_current == True, Agreement.agreement_id.in_(list(agreement_ids_set)))
            .all()
        )

        agreements = helpers.query_result_to_list(content list_agreements)

        if args.get("populate_agreements"):
            current_user_id = args.get("current_user_id")
            agreements = populate_agreement_metadata(
                session, list(agreement_ids_set), agreements, current_user_id
            )

            add_users_to_agreements(session, agreements, current_user_id)

        # { agreement_id => agreement }
        agreement_ids_map = {agreement["agreement_id"]: agreement for agreement in agreements}

        # { content list_id => [agreement]}
        content lists_map = {}
        for content list in content lists:
            content list_id = content list["content list_id"]
            content lists_map[content list_id] = []
            for agreement_id_dict in content list["content list_contents"]["agreement_ids"]:
                agreement_id = agreement_id_dict["agreement"]
                agreement = agreement_ids_map[agreement_id]
                content lists_map[content list_id].append(agreement)

        return content lists_map

    except sqlalchemy.orm.exc.NoResultFound:
        return {}
