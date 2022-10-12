from src.trending_strategies.base_trending_strategy import BaseTrendingStrategy
from src.trending_strategies.EJ57D_trending_digital_contents_strategy import z
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)


class TrendingContentListsStrategyEJ57D(BaseTrendingStrategy):
    def __init__(self):
        super().__init__(TrendingType.CONTENT_LISTS, TrendingVersion.EJ57D)

    def get_digital_content_score(self, time_range, digital_content):
        return z(time_range, digital_content)

    def get_score_params(self):
        return {"zq": 1000, "xf": True, "pt": 0, "mt": 3}
