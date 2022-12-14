import enum

# Needs to be in it's own file, otherwise
# we get circular imports


class ChallengeEvent(str, enum.Enum):
    profile_update = "profile_update"
    repost = "repost"
    follow = "follow"
    favorite = "favorite"
    digital_content_listen = "digital_content_listen"
    digital_content_upload = "digital_content_upload"
    referral_signup = "referral_signup"  # Fired for the referring user
    referred_signup = "referred_signup"  # Fired for the new user
    connect_verified = "connect_verified"
    mobile_install = "mobile_install"
    trending_digital_content = "trending_digital_content"
    trending_underground = "trending_underground"
    trending_content_list = "trending_content_list"
    send_tip = "send_tip"  # Fired for sender
    first_content_list = "first_content_list"
