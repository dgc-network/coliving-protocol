from typing import Any, Dict

# Required format for digital_content metadata retrieved from IPFS

digital_content_metadata_format: Dict[str, Any] = {
    "owner_id": None,
    "title": None,
    "route_id": None,
    "length": 0,
    "cover_art": None,
    "cover_art_sizes": None,
    "tags": None,
    "genre": None,
    "mood": None,
    "credits_splits": None,
    "create_date": None,
    "release_date": None,
    "file_type": None,
    "description": None,
    "license": None,
    "isrc": None,
    "iswc": None,
    "digital_content_segments": [],
    "download": {},
    "remix_of": None,
    "is_unlisted": False,
    "field_visibility": None,
    "stem_of": None,
}

# Required format for user metadata retrieved from IPFS
user_metadata_format = {
    "profile_picture": None,
    "profile_picture_sizes": None,
    "cover_photo": None,
    "cover_photo_sizes": None,
    "bio": None,
    "name": None,
    "location": None,
    "handle": None,
    "associated_wallets": None,
    "associated_sol_wallets": None,
    "collectibles": None,
    "content_list_library": None,
    "events": None,
    "is_deactivated": None,
}
