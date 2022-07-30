import logging
from functools import reduce

from sqlalchemy import asc, desc, func
from src.models.metrics.app_name_metrics import AppNameMetric
from src.models.metrics.route_metrics import RouteMetric
from src.utils import db_session

logger = logging.getLogger(__name__)


def get_app_names(args):
    """
    Returns a list of app names

    Args:
        args: dict The parsed args from the request
        args.offset: number The offset to start querying from
        args.limit: number The max number of queries to return
        args.start_time: date The start of the query
        args.include_unknown: bool Whether or not to include a line item for unknown

    Returns:
        Array of dictionaries with name, count, and unique_count fields
    """
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        app_names = (
            session.query(
                AppNameMetric.application_name,
                func.sum(AppNameMetric.count).label("count"),
                func.count(AppNameMetric.ip.distinct()),
            )
            .filter(AppNameMetric.timestamp > args.get("start_time"))
            .group_by(AppNameMetric.application_name)
            .order_by(desc("count"), asc(AppNameMetric.application_name))
            .limit(args.get("limit"))
            .offset(args.get("offset"))
            .all()
        )

        names = [
            {"name": app_name[0], "count": app_name[1], "unique_count": app_name[2]}
            for app_name in app_names
        ]

        if args.get("include_unknown", False):
            existing_count = reduce(lambda x, y: x + y["count"], names, 0)
            existing_unique_count = reduce(lambda x, y: x + y["unique_count"], names, 0)
            total_requests = (
                session.query(
                    func.sum(RouteMetric.count).label("count"),
                    func.count(RouteMetric.ip.distinct()),
                )
                .filter(RouteMetric.timestamp > args.get("start_time"))
                .first()
            )
            unknown_count = total_requests[0] - existing_count
            unique_count = total_requests[1] - existing_unique_count
            # Insert unique counts "in order" (desc by count)
            for i, name in enumerate(names[:]):
                if unknown_count > name["count"] or i == len(names):
                    names.insert(
                        i,
                        {
                            "name": "unknown",
                            "count": unknown_count,
                            "unique_count": unique_count,
                        },
                    )
                    break

        return names
