// Debouncing time for agreement notification being removed by playlist/album notif.
// When an artist uploads an album (playlist), the agreements for the album are usually uploaded first.
// We don't want to notify a user for each of those agreements and then notify the user for the
// creation of the album, so we debounce the agreement creation notifications for some number of
// seconds to allow for the case an album or playlist shows up. That album or playlist replaces
// all the agreement notifications that occurred over the debounce.
// As a TODO, we should implement agreement => playlist or agreement => album agreementing so this is a non-issue.
const PENDING_CREATE_DEDUPE_MS = 3 * 60 * 1000
const getPendingCreateDedupeMs = () => {
  return PENDING_CREATE_DEDUPE_MS
}

module.exports = {
  getPendingCreateDedupeMs
}
