// ─── MarketingWiz API Client ──────────────────────────────────────────────────
// Central API utility. All pages import from here.
// JWT is stored in localStorage under 'mw_token'.

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export const VALID_TRANSITIONS = {
  draft:             ['in_progress', 'discarded'],
  in_progress:       ['resolved', 'discarded'],
  resolved:          ['internal_review'],
  internal_review:   ['client_review', 'revisions'],
  client_review:     ['compliance_review', 'revisions'],
  compliance_review: ['approved', 'revisions'],
  approved:          ['closed'],
  revisions:         ['internal_review'],
  closed:            [],
  discarded:         [],
}

export function getToken() {
  return localStorage.getItem('mw_token')
}

export function setToken(token) {
  localStorage.setItem('mw_token', token)
}

export function clearToken() {
  localStorage.removeItem('mw_token')
  localStorage.removeItem('mw_user')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Auto-logout on expired/invalid token (skip on the login page itself)
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      clearToken()
      window.location.href = '/login'
      return
    }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (body) =>
    request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => request('/notifications'),
  unreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  admin: () => request('/dashboard/admin'),
  member: () => request('/dashboard/member'),
  overdueTickets: () => request('/dashboard/overdue-tickets'),
  teamWorkload: () => request('/dashboard/team-workload'),
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const ticketsApi = {
  list: (filters = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v && v !== 'all' && v !== 'any' && v !== 'anyone' && v !== ''
      )
    )
    const params = new URLSearchParams(clean).toString()
    return request(`/tickets${params ? `?${params}` : ''}`)
  },
  get: (id) => request(`/tickets/${id}`),
  update: (id, body) =>
    request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  assignApprove: (id, body) =>
    request(`/tickets/${id}/assign-approve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  discard: (id) => request(`/tickets/${id}/discard`, { method: 'PATCH' }),
  regenerate: (id, body = {}) =>
    request(`/tickets/${id}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resolve: (id, body = {}) =>
    request(`/tickets/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  create: (body) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(body) }),
  getTimeLogs: (id) => request(`/tickets/${id}/time-logs`),
  createTimeLog: (id, body) =>
    request(`/tickets/${id}/time-logs`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateTimeLog: (id, logId, body) =>
    request(`/tickets/${id}/time-logs/${logId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteTimeLog: (id, logId) =>
    request(`/tickets/${id}/time-logs/${logId}`, { method: 'DELETE' }),
  deleteTicket: (id) =>
    request(`/tickets/${id}`, { method: 'DELETE' }),
  archive: (id, archived) =>
    request(`/tickets/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    }),
  transition: (id, status, changeNote) =>
    request(`/tickets/${id}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(changeNote !== undefined && { change_note: changeNote }) }),
    }),
}

// ─── Firms ────────────────────────────────────────────────────────────────────

export const firmsApi = {
  list: () => request('/firms'),
  get: (id) => request(`/firms/${id}`),
  create: (body) =>
    request('/firms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/firms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/firms/${id}`, { method: 'DELETE' }),
}

// ─── Transcripts ──────────────────────────────────────────────────────────────

export const transcriptsApi = {
  list: (archived = false) => {
    if (archived === 'all') return request('/transcripts?archived=all')
    if (archived === true || archived === 'true') return request('/transcripts?archived=true')
    return request('/transcripts')
  },
  toggleArchive: (id) =>
    request(`/transcripts/${id}/archive`, { method: 'PATCH' }),
  process: (id, body) =>
    request(`/transcripts/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sync: () => request('/transcripts/sync', { method: 'POST' }),
  create: (body) =>
    request('/transcripts', { method: 'POST', body: JSON.stringify(body) }),
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export const promptsApi = {
  list: () => request('/prompts'),
  create: (body) =>
    request('/prompts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/prompts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export const teamApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/team${qs ? `?${qs}` : ''}`)
  },
  get: (id) => request(`/team/${id}`),
  create: (body) =>
    request('/team', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/team/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/team/${id}`, { method: 'DELETE' }),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a Tailwind class string for a ticket status badge.
 * Use as: <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(status)}`}>
 */
export function getStatusBadge(status) {
  const styles = {
    draft:             'bg-surface-container-high text-on-surface-variant',
    in_progress:       'bg-blue-100 text-blue-700',
    resolved:          'bg-teal-100 text-teal-700',
    internal_review:   'bg-violet-100 text-violet-700',
    client_review:     'bg-indigo-100 text-indigo-700',
    compliance_review: 'bg-amber-100 text-amber-700',
    approved:          'bg-emerald-100 text-emerald-700',
    closed:            'bg-emerald-200 text-emerald-800',
    revisions:         'bg-orange-100 text-orange-700',
    discarded:         'bg-red-100 text-red-500',
  }
  return styles[status] ?? styles.draft
}

const _STATUS_LABELS = {
  draft:             'New',
  in_progress:       'In Progress',
  resolved:          'Resolved',
  internal_review:   'Internal Review',
  client_review:     'Client Review',
  compliance_review: 'Compliance Review',
  approved:          'Approved',
  closed:            'Closed',
  revisions:         'Revisions',
  discarded:         'Discarded',
}

/**
 * Returns an array of { label, style } badge objects for a ticket's status.
 * For in_progress tickets: shows "Approved" + "New" until time is logged,
 * then shows "In Progress" once the member starts working.
 * Pass spentHours explicitly on detail pages where it's computed from filtered logs.
 */
export function getStatusBadges(ticket, spentHours = null) {
  const spent = spentHours ?? (ticket.time_spent ?? 0)
  if (ticket.status === 'in_progress') {
    if (spent > 0)
      return [{ label: 'In Progress', style: 'bg-blue-100 text-blue-700' }]
    return [
      { label: 'Approved', style: 'bg-emerald-100 text-emerald-700' },
      { label: 'New',      style: 'bg-surface-container-high text-on-surface-variant' },
    ]
  }
  return [{ label: _STATUS_LABELS[ticket.status] ?? ticket.status, style: getStatusBadge(ticket.status) }]
}

/** Format ISO timestamp → "Oct 24, 2023" */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Format seconds → "45m 12s" or "1h 12m" */
export function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

/** Relative time from now → "2 hours ago", "Just now", "3 days ago" */
export function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/** Format hours decimal → "1h 30m" style */
export function formatHours(h) {
  const n = parseFloat(h)
  if (h == null || isNaN(n)) return '—'
  const hrs = Math.floor(n)
  const mins = Math.round((n - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

/** Decompose a decimal hours value into whole hours and minutes */
export function decimalToHoursMinutes(decimal) {
  if (decimal == null || isNaN(parseFloat(decimal))) return { hrs: 0, mins: 0 }
  const n = parseFloat(decimal)
  const hrs = Math.floor(n)
  const mins = Math.round((n - hrs) * 60)
  return { hrs, mins }
}

/** Combine whole hours and minutes into a decimal hours value */
export function hoursMinutesToDecimal(hrs, mins) {
  const h = parseInt(hrs, 10) || 0
  const m = parseInt(mins, 10) || 0
  return Math.round((h + m / 60) * 100) / 100
}
