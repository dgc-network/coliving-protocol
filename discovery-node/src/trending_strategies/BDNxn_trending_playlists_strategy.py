from src.trending_strategies.base_trending_strategy import BaseTrendingStrategy
from src.trending_strategies.EJ57D_trending_agreements_strategy import z
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)


class TrendingContentListsStrategyBDNxn(BaseTrendingStrategy):
    def __init__(self):
        super().__init__(TrendingType.CONTENT_LISTS, TrendingVersion.BDNxn)

    def get_agreement_score(self, time_range, content list):
        return z(time_range, content list)

    def get_score_params(self):
        return {"zq": 1000, "xf": True, "pt": 0, "mt": 3}
