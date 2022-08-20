import enum

# Needs to be in it's own file, otherwise
# we get circular imports


class ChallengeEvent(str, enum.Enum):
    profile_update = "profile_update"
    repost = "repost"
    follow = "follow"
    favorite = "favorite"
    agreement_listen = "agreement_listen"
    agreement_upload = "agreement_upload"
    referral_signup = "referral_signup"  # Fired for the referring user
    referred_signup = "referred_signup"  # Fired for the new user
    connect_verified = "connect_verified"
    mobile_install = "mobile_install"
    trending_agreement = "trending_agreement"
    trending_underground = "trending_underground"
    trending_contentList = "trending_contentList"
    send_tip = "send_tip"  # Fired for sender
    first_contentList = "first_contentList"
