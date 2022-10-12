from datetime import datetime

from dateutil.parser import parse
from src.trending_strategies.base_trending_strategy import BaseTrendingStrategy
from src.trending_strategies.trending_type_and_version import (
    TrendingType,
    TrendingVersion,
)

b = 5
qw = 50
hg = 1
ie = 0.25
pn = 0.01
u = 30.0
qq = 0.001
oi = 20
nb = 750


class UndergroundTrendingDigitalContentsStrategyEJ57D(BaseTrendingStrategy):
    def __init__(self):
        super().__init__(TrendingType.UNDERGROUND_AGREEMENTS, TrendingVersion.EJ57D)

    def get_digital_content_score(self, time_range, digital_content):
        # pylint: disable=W,C,R
        mn = digital_content["listens"]
        c = digital_content["windowed_repost_count"]
        x = digital_content["repost_count"]
        v = digital_content["windowed_save_count"]
        ut = digital_content["save_count"]
        ll = digital_content["created_at"]
        bq = digital_content["owner_follower_count"]
        ty = digital_content["owner_verified"]
        kz = digital_content["karma"]
        xy = max
        uk = pow
        if bq < 3:
            return {"score": 0, **digital_content}
        oj = qq if ty else 1
        zu = 1
        if bq >= nb:
            zu = xy(uk(oi, 1 - ((1 / nb) * (bq - nb) + 1)), 1 / oi)
        vb = (b * mn + qw * c + hg * v + ie * x + pn * ut + zu * bq) * kz * zu * oj
        te = 7
        fd = datetime.now()
        xn = parse(ll)
        ul = (fd - xn).days
        rq = 1
        if ul > te:
            rq = xy((1.0 / u), (uk(u, (1 - ul / te))))
        return {"score": vb * rq, **digital_content}

    def get_score_params(self):
        return {
            "S": 1500,
            "r": 1500,
            "q": 50,
            "o": 21,
            "f": 7,
            "qr": 10,
            "xf": True,
            "pt": 0,
        }
