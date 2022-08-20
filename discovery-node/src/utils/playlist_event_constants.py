# Source of truth for events emitted by the ContentListFactory contract

# Lookup from property to event name from the ContentListFactory contract
contentList_event_types_lookup = {
    "contentList_created": "ContentListCreated",
    "contentList_deleted": "ContentListDeleted",
    "contentList_agreement_added": "ContentListAgreementAdded",
    "contentList_agreement_deleted": "ContentListAgreementDeleted",
    "contentList_agreements_ordered": "ContentListAgreementsOrdered",
    "contentList_name_updated": "ContentListNameUpdated",
    "contentList_privacy_updated": "ContentListPrivacyUpdated",
    "contentList_cover_photo_updated": "ContentListCoverPhotoUpdated",
    "contentList_description_updated": "ContentListDescriptionUpdated",
    "contentList_upc_updated": "ContentListUPCUpdated",
}

# Array version of lookup with event names from the ContentListFactory contract
contentList_event_types_arr = [
    contentList_event_types_lookup["contentList_created"],
    contentList_event_types_lookup["contentList_deleted"],
    contentList_event_types_lookup["contentList_agreement_added"],
    contentList_event_types_lookup["contentList_agreement_deleted"],
    contentList_event_types_lookup["contentList_agreements_ordered"],
    contentList_event_types_lookup["contentList_name_updated"],
    contentList_event_types_lookup["contentList_privacy_updated"],
    contentList_event_types_lookup["contentList_cover_photo_updated"],
    contentList_event_types_lookup["contentList_description_updated"],
    contentList_event_types_lookup["contentList_upc_updated"],
]
