# Source of truth for events emitted by the ContentListFactory contract

# Lookup from property to event name from the ContentListFactory contract
content_list_event_types_lookup = {
    "content_list_created": "ContentListCreated",
    "content_list_deleted": "ContentListDeleted",
    "content_list_digital_content_added": "ContentListDigitalContentAdded",
    "content_list_digital_content_deleted": "ContentListDigitalContentDeleted",
    "content_list_digital_contents_ordered": "ContentListDigitalContentsOrdered",
    "content_list_name_updated": "ContentListNameUpdated",
    "content_list_privacy_updated": "ContentListPrivacyUpdated",
    "content_list_cover_photo_updated": "ContentListCoverPhotoUpdated",
    "content_list_description_updated": "ContentListDescriptionUpdated",
    "content_list_upc_updated": "ContentListUPCUpdated",
}

# Array version of lookup with event names from the ContentListFactory contract
content_list_event_types_arr = [
    content_list_event_types_lookup["content_list_created"],
    content_list_event_types_lookup["content_list_deleted"],
    content_list_event_types_lookup["content_list_digital_content_added"],
    content_list_event_types_lookup["content_list_digital_content_deleted"],
    content_list_event_types_lookup["content_list_digital_contents_ordered"],
    content_list_event_types_lookup["content_list_name_updated"],
    content_list_event_types_lookup["content_list_privacy_updated"],
    content_list_event_types_lookup["content_list_cover_photo_updated"],
    content_list_event_types_lookup["content_list_description_updated"],
    content_list_event_types_lookup["content_list_upc_updated"],
]
