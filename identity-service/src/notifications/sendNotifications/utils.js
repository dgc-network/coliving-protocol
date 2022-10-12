// Debouncing time for digital_content notification being removed by contentList/album notif.
// When an landlord uploads an album (contentList), the agreements for the album are usually uploaded first.
// We don't want to notify a user for each of those agreements and then notify the user for the
// creation of the album, so we debounce the digital_content creation notifications for some number of
// seconds to allow for the case an album or contentList shows up. That album or contentList replaces
// all the digital_content notifications that occurred over the debounce.
// As a TODO, we should implement digital_content => contentList or digital_content => album tracking so this is a non-issue.
const PENDING_CREATE_DEDUPE_MS = 3 * 60 * 1000
const getPendingCreateDedupeMs = () => {
  return PENDING_CREATE_DEDUPE_MS
}

module.exports = {
  getPendingCreateDedupeMs
}
