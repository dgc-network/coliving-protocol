# Source of truth for events emitted by the ContentListFactory contract

# Lookup from property to event name from the ContentListFactory contract
content list_event_types_lookup = {
    "content list_created": "ContentListCreated",
    "content list_deleted": "ContentListDeleted",
    "content list_agreement_added": "ContentListAgreementAdded",
    "content list_agreement_deleted": "ContentListAgreementDeleted",
    "content list_agreements_ordered": "ContentListAgreementsOrdered",
    "content list_name_updated": "ContentListNameUpdated",
    "content list_privacy_updated": "ContentListPrivacyUpdated",
    "content list_cover_photo_updated": "ContentListCoverPhotoUpdated",
    "content list_description_updated": "ContentListDescriptionUpdated",
    "content list_upc_updated": "ContentListUPCUpdated",
}

# Array version of lookup with event names from the ContentListFactory contract
content list_event_types_arr = [
    content list_event_types_lookup["content list_created"],
    content list_event_types_lookup["content list_deleted"],
    content list_event_types_lookup["content list_agreement_added"],
    content list_event_types_lookup["content list_agreement_deleted"],
    content list_event_types_lookup["content list_agreements_ordered"],
    content list_event_types_lookup["content list_name_updated"],
    content list_event_types_lookup["content list_privacy_updated"],
    content list_event_types_lookup["content list_cover_photo_updated"],
    content list_event_types_lookup["content list_description_updated"],
    content list_event_types_lookup["content list_upc_updated"],
]
