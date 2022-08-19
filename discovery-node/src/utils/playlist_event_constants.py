# Source of truth for events emitted by the PlaylistFactory contract

# Lookup from property to event name from the PlaylistFactory contract
playlist_event_types_lookup = {
    "playlist_created": "PlaylistCreated",
    "playlist_deleted": "PlaylistDeleted",
    "playlist_agreement_added": "PlaylistAgreementAdded",
    "playlist_agreement_deleted": "PlaylistAgreementDeleted",
    "playlist_agreements_ordered": "PlaylistAgreementsOrdered",
    "playlist_name_updated": "PlaylistNameUpdated",
    "playlist_privacy_updated": "PlaylistPrivacyUpdated",
    "playlist_cover_photo_updated": "PlaylistCoverPhotoUpdated",
    "playlist_description_updated": "PlaylistDescriptionUpdated",
    "playlist_upc_updated": "PlaylistUPCUpdated",
}

# Array version of lookup with event names from the PlaylistFactory contract
playlist_event_types_arr = [
    playlist_event_types_lookup["playlist_created"],
    playlist_event_types_lookup["playlist_deleted"],
    playlist_event_types_lookup["playlist_agreement_added"],
    playlist_event_types_lookup["playlist_agreement_deleted"],
    playlist_event_types_lookup["playlist_agreements_ordered"],
    playlist_event_types_lookup["playlist_name_updated"],
    playlist_event_types_lookup["playlist_privacy_updated"],
    playlist_event_types_lookup["playlist_cover_photo_updated"],
    playlist_event_types_lookup["playlist_description_updated"],
    playlist_event_types_lookup["playlist_upc_updated"],
]
