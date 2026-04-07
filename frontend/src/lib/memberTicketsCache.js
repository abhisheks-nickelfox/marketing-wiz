// Simple in-memory cache for member ticket list.
// Both TicketList (hub) and TicketCategoryList share this so navigating
// between them doesn't trigger redundant API calls.
// TTL: 45 seconds — short enough to stay fresh, long enough to avoid
// reloads during normal in-session navigation.

const TTL_MS = 45_000

let _cache = null // { userId, data, ts }

export function getCachedTickets(userId) {
  if (!_cache) return null
  if (_cache.userId !== userId) return null
  if (Date.now() - _cache.ts > TTL_MS) return null
  return _cache.data
}

export function setCachedTickets(userId, data) {
  _cache = { userId, data, ts: Date.now() }
}

export function invalidateMemberTicketsCache() {
  _cache = null
}
