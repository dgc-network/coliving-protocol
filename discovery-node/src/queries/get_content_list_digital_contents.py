import logging  # pylint: disable=C0302

import sqlalchemy
from src.models.content_lists.content_list import ContentList
from src.models.digitalContents.digital_content import DigitalContent
from src.queries.query_helpers import add_users_to_digital_contents, populate_digital_content_metadata
from src.utils import helpers

logger = logging.getLogger(__name__)


def get_content_list_digital_contents(session, args):
    """Accepts args:
    {
        # optionally pass in full contentLists to avoid having to fetch
        "content_lists": ContentList[]

        # not needed if contentLists are passed
        "content_list_ids": string[]
        "current_user_id": int
        "populate_digital_contents": boolean # whether to add users & metadata to digitalContents
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

        # digital_content_id -> [content_list_id]
        digital_content_ids_set = set()
        for contentList in contentLists:
            content_list_id = contentList["content_list_id"]
            for digital_content_id_dict in contentList["content_list_contents"]["digital_content_ids"]:
                digital_content_id = digital_content_id_dict["digital_content"]
                digital_content_ids_set.add(digital_content_id)

        content_list_digital_contents = (
            session.query(DigitalContent)
            .filter(DigitalContent.is_current == True, DigitalContent.digital_content_id.in_(list(digital_content_ids_set)))
            .all()
        )

        digitalContents = helpers.query_result_to_list(content_list_digital_contents)

        if args.get("populate_digital_contents"):
            current_user_id = args.get("current_user_id")
            digitalContents = populate_digital_content_metadata(
                session, list(digital_content_ids_set), digitalContents, current_user_id
            )

            add_users_to_digital_contents(session, digitalContents, current_user_id)

        # { digital_content_id => digital_content }
        digital_content_ids_map = {digital_content["digital_content_id"]: digital_content for digital_content in digitalContents}

        # { content_list_id => [digital_content]}
        content_lists_map = {}
        for contentList in contentLists:
            content_list_id = contentList["content_list_id"]
            content_lists_map[content_list_id] = []
            for digital_content_id_dict in contentList["content_list_contents"]["digital_content_ids"]:
                digital_content_id = digital_content_id_dict["digital_content"]
                digital_content = digital_content_ids_map[digital_content_id]
                content_lists_map[content_list_id].append(digital_content)

        return content_lists_map

    except sqlalchemy.orm.exc.NoResultFound:
        return {}
