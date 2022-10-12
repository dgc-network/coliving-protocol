from src.trending_strategies.BDNxn_trending_content_lists_strategy import (
    TrendingContentListsStrategyBDNxn,
)
from src.trending_strategies.EJ57D_trending_content_lists_strategy import (
    TrendingContentListsStrategyEJ57D,
)
from src.trending_strategies.EJ57D_trending_digital_contents_strategy import (
    TrendingDigitalContentsStrategyEJ57D,
)
from src.trending_strategies.EJ57D_underground_trending_digital_contents_strategy import (
    UndergroundTrendingDigitalContentsStrategyEJ57D,
)
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)

DEFAULT_TRENDING_VERSIONS = {
    TrendingType.AGREEMENTS: TrendingVersion.EJ57D,
    TrendingType.UNDERGROUND_AGREEMENTS: TrendingVersion.EJ57D,
    TrendingType.CONTENT_LISTS: TrendingVersion.EJ57D,
}


class TrendingStrategyFactory:
    def __init__(self):
        self.strategies = {
            TrendingType.AGREEMENTS: {
                TrendingVersion.EJ57D: TrendingDigitalContentsStrategyEJ57D(),
            },
            TrendingType.UNDERGROUND_AGREEMENTS: {
                TrendingVersion.EJ57D: UndergroundTrendingDigitalContentsStrategyEJ57D(),
            },
            TrendingType.CONTENT_LISTS: {
                TrendingVersion.EJ57D: TrendingContentListsStrategyEJ57D(),
                TrendingVersion.BDNxn: TrendingContentListsStrategyBDNxn(),
            },
        }

    def get_strategy(self, trending_type, version=None):
        if not version:
            version = DEFAULT_TRENDING_VERSIONS[trending_type]
        return self.strategies[trending_type][version]

    def get_versions_for_type(self, trending_type):
        return self.strategies[trending_type]
