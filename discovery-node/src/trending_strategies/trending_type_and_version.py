from enum import Enum


class TrendingType(Enum):
    AGREEMENTS = 1
    UNDERGROUND_AGREEMENTS = 2
    CONTENT_LISTS = 3


class TrendingVersion(Enum):
    EJ57D = "EJ57D"
    BDNxn = "BDNxn"
