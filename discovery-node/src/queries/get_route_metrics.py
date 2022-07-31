import functools as ft
import logging
import time
from datetime import date, timedelta

from sqlalchemy import asc, desc, func, or_
from src import exceptions
from src.models.metrics.aggregate_daily_total_users_metrics import (
    AggregateDailyTotalUsersMetrics,
)
from src.models.metrics.aggregate_daily_unique_users_metrics import (
    AggregateDailyUniqueUsersMetrics,
)
from src.models.metrics.aggregate_monthly_total_users_metrics import (
    AggregateMonthlyTotalUsersMetric,
)
from src.models.metrics.aggregate_monthly_unique_users_metrics import (
    AggregateMonthlyUniqueUsersMetric,
)
from src.models.metrics.route_metrics import RouteMetric
from src.models.metrics.route_metrics_day_matview import t_route_metrics_day_bucket
from src.models.metrics.route_metrics_month_matview import t_route_metrics_month_bucket
from src.utils import db_session

logger = logging.getLogger(__name__)


def get_historical_route_metrics():
    """
    Returns daily metrics for the last thirty days and all time monthly metrics

    Returns:
        {
            daily: {
                2021/01/15: {unique_count: ..., total_count: ...}
                ...
            },
            monthly: {
                2021/01/01: {unique_count: ..., total_count: ...}
                ...
            }
        }
    """

    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        return _get_historical_route_metrics(session)


def _get_historical_route_metrics(session):
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    first_day_of_month = today.replace(day=1)

    daily_metrics = {}
    unique_daily_counts = (
        session.query(
            AggregateDailyUniqueUsersMetrics.timestamp,
            AggregateDailyUniqueUsersMetrics.count,
            AggregateDailyUniqueUsersMetrics.summed_count,
        )
        .filter(thirty_days_ago <= AggregateDailyUniqueUsersMetrics.timestamp)
        .filter(AggregateDailyUniqueUsersMetrics.timestamp < today)
        .all()
    )
    unique_daily_count_records = ft.reduce(
        lambda acc, curr: acc.update(
            {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
        )
        or acc,
        unique_daily_counts,
        {},
    )

    total_daily_counts = (
        session.query(
            AggregateDailyTotalUsersMetrics.timestamp,
            AggregateDailyTotalUsersMetrics.count,
        )
        .filter(thirty_days_ago <= AggregateDailyTotalUsersMetrics.timestamp)
        .filter(AggregateDailyTotalUsersMetrics.timestamp < today)
        .all()
    )
    total_daily_count_records = ft.reduce(
        lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
        total_daily_counts,
        {},
    )

    for timestamp, counts in unique_daily_count_records.items():
        if timestamp in total_daily_count_records:
            daily_metrics[timestamp] = {
                "unique_count": counts["unique"],
                "summed_unique_count": counts["summed_unique"],
                "total_count": total_daily_count_records[timestamp],
            }

    monthly_metrics = {}
    unique_monthly_counts = (
        session.query(
            AggregateMonthlyUniqueUsersMetric.timestamp,
            AggregateMonthlyUniqueUsersMetric.count,
            AggregateMonthlyUniqueUsersMetric.summed_count,
        )
        .filter(AggregateMonthlyUniqueUsersMetric.timestamp < first_day_of_month)
        .all()
    )
    unique_monthly_count_records = ft.reduce(
        lambda acc, curr: acc.update(
            {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
        )
        or acc,
        unique_monthly_counts,
        {},
    )

    total_monthly_counts = (
        session.query(
            AggregateMonthlyTotalUsersMetric.timestamp,
            AggregateMonthlyTotalUsersMetric.count,
        )
        .filter(AggregateMonthlyTotalUsersMetric.timestamp < first_day_of_month)
        .all()
    )
    total_monthly_count_records = ft.reduce(
        lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
        total_monthly_counts,
        {},
    )

    for timestamp, counts in unique_monthly_count_records.items():
        if timestamp in total_monthly_count_records:
            monthly_metrics[timestamp] = {
                "unique_count": counts["unique"],
                "summed_unique_count": counts["summed_unique"],
                "total_count": total_monthly_count_records[timestamp],
            }

    return {"daily": daily_metrics, "monthly": monthly_metrics}


def get_aggregate_route_metrics(time_range, bucket_size):
    """
    Returns a list of timestamp with unique count and total count for all routes
    based on given time range and grouped by bucket size

    Returns:
        [{ timestamp, unique_count, total_count }]
    """
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        return _get_aggregate_route_metrics(session, time_range, bucket_size)


def _get_aggregate_route_metrics(session, time_range, bucket_size):
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    first_day_of_month = today.replace(day=1)

    if time_range == "week":
        if bucket_size == "day":
            unique_counts = (
                session.query(
                    AggregateDailyUniqueUsersMetrics.timestamp,
                    AggregateDailyUniqueUsersMetrics.count,
                    AggregateDailyUniqueUsersMetrics.summed_count,
                )
                .filter(seven_days_ago <= AggregateDailyUniqueUsersMetrics.timestamp)
                .filter(AggregateDailyUniqueUsersMetrics.timestamp < today)
                .order_by(asc("timestamp"))
                .all()
            )
            unique_count_records = ft.reduce(
                lambda acc, curr: acc.update(
                    {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
                )
                or acc,
                unique_counts,
                {},
            )

            total_counts = (
                session.query(
                    AggregateDailyTotalUsersMetrics.timestamp,
                    AggregateDailyTotalUsersMetrics.count,
                )
                .filter(seven_days_ago <= AggregateDailyTotalUsersMetrics.timestamp)
                .filter(AggregateDailyTotalUsersMetrics.timestamp < today)
                .order_by(asc("timestamp"))
                .all()
            )
            total_count_records = ft.reduce(
                lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
                total_counts,
                {},
            )

            metrics = []
            for timestamp, counts in unique_count_records.items():
                if timestamp in total_count_records:
                    metrics.append(
                        {
                            "timestamp": timestamp,
                            "unique_count": counts["unique"],
                            "summed_unique_count": counts["summed_unique"],
                            "total_count": total_count_records[timestamp],
                        }
                    )
            return metrics
        raise exceptions.ArgumentError("Invalid bucket_size for time_range")
    if time_range == "month":
        if bucket_size == "day":
            unique_counts = (
                session.query(
                    AggregateDailyUniqueUsersMetrics.timestamp,
                    AggregateDailyUniqueUsersMetrics.count,
                    AggregateDailyUniqueUsersMetrics.summed_count,
                )
                .filter(thirty_days_ago <= AggregateDailyUniqueUsersMetrics.timestamp)
                .filter(AggregateDailyUniqueUsersMetrics.timestamp < today)
                .order_by(asc("timestamp"))
                .all()
            )
            unique_count_records = ft.reduce(
                lambda acc, curr: acc.update(
                    {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
                )
                or acc,
                unique_counts,
                {},
            )

            total_counts = (
                session.query(
                    AggregateDailyTotalUsersMetrics.timestamp,
                    AggregateDailyTotalUsersMetrics.count,
                )
                .filter(thirty_days_ago <= AggregateDailyTotalUsersMetrics.timestamp)
                .filter(AggregateDailyTotalUsersMetrics.timestamp < today)
                .order_by(asc("timestamp"))
                .all()
            )
            total_count_records = ft.reduce(
                lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
                total_counts,
                {},
            )

            metrics = []
            for timestamp, counts in unique_count_records.items():
                if timestamp in total_count_records:
                    metrics.append(
                        {
                            "timestamp": timestamp,
                            "unique_count": counts["unique"],
                            "summed_unique_count": counts["summed_unique"],
                            "total_count": total_count_records[timestamp],
                        }
                    )
            return metrics
        if bucket_size == "week":
            unique_counts = (
                session.query(
                    func.date_trunc(
                        bucket_size, AggregateDailyUniqueUsersMetrics.timestamp
                    ).label("timestamp"),
                    func.sum(AggregateDailyUniqueUsersMetrics.count).label("count"),
                    func.sum(AggregateDailyUniqueUsersMetrics.summed_count).label(
                        "summed_count"
                    ),
                )
                .filter(thirty_days_ago <= AggregateDailyUniqueUsersMetrics.timestamp)
                .filter(AggregateDailyUniqueUsersMetrics.timestamp < today)
                .group_by(
                    func.date_trunc(
                        bucket_size, AggregateDailyUniqueUsersMetrics.timestamp
                    )
                )
                .order_by(asc("timestamp"))
                .all()
            )
            unique_count_records = ft.reduce(
                lambda acc, curr: acc.update(
                    {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
                )
                or acc,
                unique_counts,
                {},
            )

            total_counts = (
                session.query(
                    func.date_trunc(
                        bucket_size, AggregateDailyTotalUsersMetrics.timestamp
                    ).label("timestamp"),
                    func.sum(AggregateDailyTotalUsersMetrics.count).label("count"),
                )
                .filter(thirty_days_ago <= AggregateDailyTotalUsersMetrics.timestamp)
                .filter(AggregateDailyTotalUsersMetrics.timestamp < today)
                .group_by(
                    func.date_trunc(
                        bucket_size, AggregateDailyTotalUsersMetrics.timestamp
                    )
                )
                .order_by(asc("timestamp"))
                .all()
            )
            total_count_records = ft.reduce(
                lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
                total_counts,
                {},
            )

            metrics = []
            for timestamp, counts in unique_count_records.items():
                if timestamp in total_count_records:
                    metrics.append(
                        {
                            "timestamp": timestamp,
                            "unique_count": counts["unique"],
                            "summed_unique_count": counts["summed_unique"],
                            "total_count": total_count_records[timestamp],
                        }
                    )
            return metrics
        raise exceptions.ArgumentError("Invalid bucket_size for time_range")
    if time_range == "all_time":
        if bucket_size == "month":
            unique_counts = (
                session.query(
                    AggregateMonthlyUniqueUsersMetric.timestamp,
                    AggregateMonthlyUniqueUsersMetric.count,
                    AggregateMonthlyUniqueUsersMetric.summed_count,
                )
                .filter(
                    AggregateMonthlyUniqueUsersMetric.timestamp < first_day_of_month
                )
                .order_by(asc("timestamp"))
                .all()
            )
            unique_count_records = ft.reduce(
                lambda acc, curr: acc.update(
                    {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
                )
                or acc,
                unique_counts,
                {},
            )

            total_counts = (
                session.query(
                    AggregateMonthlyTotalUsersMetric.timestamp,
                    AggregateMonthlyTotalUsersMetric.count,
                )
                .filter(AggregateMonthlyTotalUsersMetric.timestamp < first_day_of_month)
                .order_by(asc("timestamp"))
                .all()
            )
            total_count_records = ft.reduce(
                lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
                total_counts,
                {},
            )

            metrics = []
            for timestamp, counts in unique_count_records.items():
                if timestamp in total_count_records:
                    metrics.append(
                        {
                            "timestamp": timestamp,
                            "unique_count": counts["unique"],
                            "summed_unique_count": counts["summed_unique"],
                            "total_count": total_count_records[timestamp],
                        }
                    )
            return metrics
        if bucket_size == "week":
            unique_counts = (
                session.query(
                    func.date_trunc(
                        bucket_size, AggregateDailyUniqueUsersMetrics.timestamp
                    ).label("timestamp"),
                    func.sum(AggregateDailyUniqueUsersMetrics.count).label("count"),
                    func.sum(AggregateDailyUniqueUsersMetrics.summed_count).label(
                        "summed_count"
                    ),
                )
                .filter(AggregateDailyUniqueUsersMetrics.timestamp < today)
                .group_by(
                    func.date_trunc(
                        bucket_size, AggregateDailyUniqueUsersMetrics.timestamp
                    )
                )
                .order_by(asc("timestamp"))
                .all()
            )
            unique_count_records = ft.reduce(
                lambda acc, curr: acc.update(
                    {str(curr[0]): {"unique": curr[1], "summed_unique": curr[2] or 0}}
                )
                or acc,
                unique_counts,
                {},
            )

            total_counts = (
                session.query(
                    func.date_trunc(
                        bucket_size, AggregateDailyTotalUsersMetrics.timestamp
                    ).label("timestamp"),
                    func.sum(AggregateDailyTotalUsersMetrics.count).label("count"),
                )
                .filter(AggregateDailyTotalUsersMetrics.timestamp < today)
                .group_by(
                    func.date_trunc(
                        bucket_size, AggregateDailyTotalUsersMetrics.timestamp
                    )
                )
                .order_by(asc("timestamp"))
                .all()
            )
            total_count_records = ft.reduce(
                lambda acc, curr: acc.update({str(curr[0]): curr[1]}) or acc,
                total_counts,
                {},
            )

            metrics = []
            for timestamp, counts in unique_count_records.items():
                if timestamp in total_count_records:
                    metrics.append(
                        {
                            "timestamp": timestamp,
                            "unique_count": counts["unique"],
                            "summed_unique_count": counts["summed_unique"],
                            "total_count": total_count_records[timestamp],
                        }
                    )
            return metrics
        raise exceptions.ArgumentError("Invalid bucket_size for time_range")
    raise exceptions.ArgumentError("Invalid time_range")


def get_route_metrics(args):
    """
    Returns the usage metrics for routes

    Args:
        args: dict The parsed args from the request
        args.path: string The route path of the query
        args.start_time: date The start of the query
        args.query_string: optional string The query string to filter on
        args.limit: number The max number of responses to return
        args.bucket_size: string  date_trunc operation to aggregate timestamps by

    Returns:
        Array of dictionaries with the route, timestamp, count, and unique_count
    """
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        return _get_route_metrics(session, args)


def _make_metrics_tuple(metric):
    return {
        "timestamp": int(time.mktime(metric.time.timetuple())),
        "count": metric.count,
        "unique_count": metric.unique_count,
    }


def _get_route_metrics(session, args):
    # Protocol dashboard optimization:
    # If we're in 'simple' mode (only asking for day/month bucket, no path or query string),
    # query the corresponding matview instead of hitting the DB.
    is_simple_args = (
        args.get("path") == ""
        and args.get("query_string") == None
        and args.get("start_time")
        and args.get("exact") == False
        and args.get("version") == None
    )
    bucket_size = args.get("bucket_size")
    if is_simple_args and bucket_size in ["day", "month"]:
        query = None
        if bucket_size == "day":
            # subtract 1 day from the start_time so that the last day is fully complete
            query = session.query(t_route_metrics_day_bucket).filter(
                t_route_metrics_day_bucket.c.time
                > (args.get("start_time") - timedelta(days=1))
            )

        else:
            query = session.query(t_route_metrics_month_bucket).filter(
                t_route_metrics_month_bucket.c.time > (args.get("start_time"))
            )

        query = query.order_by(desc("time")).limit(args.get("limit")).all()
        metrics = list(map(_make_metrics_tuple, query))
        return metrics

    metrics_query = session.query(
        func.date_trunc(args.get("bucket_size"), RouteMetric.timestamp).label(
            "timestamp"
        ),
        func.sum(RouteMetric.count).label("count"),
        func.count(RouteMetric.ip.distinct()).label("unique_count"),
    ).filter(RouteMetric.timestamp > args.get("start_time"))
    if args.get("exact") == True:
        metrics_query = metrics_query.filter(RouteMetric.route_path == args.get("path"))
    else:
        metrics_query = metrics_query.filter(
            RouteMetric.route_path.like(f"{args.get('path')}%")
        )

    if args.get("query_string", None) != None:
        metrics_query = metrics_query.filter(
            or_(
                RouteMetric.query_string.like(f"%{args.get('query_string')}"),
                RouteMetric.query_string.like(f"%{args.get('query_string')}&%"),
            )
        )

    metrics_query = (
        metrics_query.group_by(
            func.date_trunc(args.get("bucket_size"), RouteMetric.timestamp)
        )
        .order_by(desc("timestamp"))
        .limit(args.get("limit"))
    )

    metrics = metrics_query.all()

    metrics = [
        {
            "timestamp": int(time.mktime(m[0].timetuple())),
            "count": m[1],
            "unique_count": m[2],
        }
        for m in metrics
    ]

    return metrics
