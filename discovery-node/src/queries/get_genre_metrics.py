import logging

from sqlalchemy import desc, func
from src.models.digitalContents.digital_content import DigitalContent
from src.utils import db_session

logger = logging.getLogger(__name__)


def get_genre_metrics(args):
    """
    Returns metrics for digital_content genres over the provided bucket

    Args:
        args: dict The parsed args from the request
        args.offset: number The offset to start querying from
        args.limit: number The max number of queries to return
        args.start_time: date The start of the query

    Returns:
        Array of dictionaries with the play counts and timestamp
    """
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        return _get_genre_metrics(session, args)


def _get_genre_metrics(session, args):
    metrics_query = (
        session.query(DigitalContent.genre, func.count(DigitalContent.digital_content_id).label("count"))
        .filter(
            DigitalContent.genre != None,
            DigitalContent.genre != "",
            DigitalContent.is_current == True,
            DigitalContent.created_at > args.get("start_time"),
        )
        .group_by(DigitalContent.genre)
        .order_by(desc("count"))
        .limit(args.get("limit"))
        .offset(args.get("offset"))
    )

    metrics = metrics_query.all()
    genres = [{"name": m[0], "count": m[1]} for m in metrics]

    return genres
