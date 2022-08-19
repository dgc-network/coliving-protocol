from src.trending_strategies.BDNxn_trending_playlists_strategy import (
    TrendingPlaylistsStrategyBDNxn,
)
from src.trending_strategies.EJ57D_trending_playlists_strategy import (
    TrendingPlaylistsStrategyEJ57D,
)
from src.trending_strategies.EJ57D_trending_agreements_strategy import (
    TrendingAgreementsStrategyEJ57D,
)
from src.trending_strategies.EJ57D_underground_trending_agreements_strategy import (
    UndergroundTrendingAgreementsStrategyEJ57D,
)
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)

DEFAULT_TRENDING_VERSIONS = {
    TrendingType.AGREEMENTS: TrendingVersion.EJ57D,
    TrendingType.UNDERGROUND_AGREEMENTS: TrendingVersion.EJ57D,
    TrendingType.PLAYLISTS: TrendingVersion.EJ57D,
}


class TrendingStrategyFactory:
    def __init__(self):
        self.strategies = {
            TrendingType.AGREEMENTS: {
                TrendingVersion.EJ57D: TrendingAgreementsStrategyEJ57D(),
            },
            TrendingType.UNDERGROUND_AGREEMENTS: {
                TrendingVersion.EJ57D: UndergroundTrendingAgreementsStrategyEJ57D(),
            },
            TrendingType.PLAYLISTS: {
                TrendingVersion.EJ57D: TrendingPlaylistsStrategyEJ57D(),
                TrendingVersion.BDNxn: TrendingPlaylistsStrategyBDNxn(),
            },
        }

    def get_strategy(self, trending_type, version=None):
        if not version:
            version = DEFAULT_TRENDING_VERSIONS[trending_type]
        return self.strategies[trending_type][version]

    def get_versions_for_type(self, trending_type):
        return self.strategies[trending_type]
