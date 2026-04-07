import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import { ticketsApi, formatHours, getStatusBadges } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { getCachedTickets, setCachedTickets } from '../../lib/memberTicketsCache'

// ─── Shared table helpers (mirrored from TicketList.jsx) ───────────────────

const getPriorityColor = (priority) => {
  const m = {
    urgent: 'bg-error-container text-on-error-container',
    high:   'bg-error-container text-on-error-container',
    normal: 'bg-surface-container-highest text-on-surface-variant',
    low:    'bg-surface-container-highest text-on-surface-variant',
  }
  return m[priority] || m.normal
}

const getStatusDot = (status) => ({
  draft:             'bg-outline-variant',
  in_progress:       'bg-blue-500',
  resolved:          'bg-emerald-500',
  internal_review:   'bg-purple-500',
  client_review:     'bg-indigo-500',
  compliance_review: 'bg-yellow-500',
  approved:          'bg-teal-500',
  closed:            'bg-zinc-500',
  revisions:         'bg-orange-500',
  discarded:         'bg-error',
}[status] ?? 'bg-outline-variant')

const TicketRow = ({ ticket }) => {
  const navigate = useNavigate()
  const spent = ticket.time_spent ?? 0
  return (
    <tr
      className="hover:bg-surface-container-low transition-colors cursor-pointer"
      onClick={() => navigate(`/member/tickets/${ticket.id}`)}
    >
      <td className="px-6 py-4">
        <span className="font-semibold text-sm text-on-surface hover:text-primary-container transition-colors">
          {ticket.title}
        </span>
        {ticket.project?.name && (
          <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
            {ticket.project.name}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-on-surface-variant">{ticket.firms?.name ?? '—'}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-tighter ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-on-surface">{formatHours(ticket.estimated_hours)}</td>
      <td className="px-6 py-4 text-sm font-medium text-on-surface">{spent > 0 ? formatHours(spent) : '—'}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(ticket.status)}`} />
          {getStatusBadges(ticket).map(({ label }) => (
            <span key={label} className="text-xs font-semibold text-on-surface-variant">{label}</span>
          ))}
        </div>
      </td>
    </tr>
  )
}

// ─── Category metadata ──────────────────────────────────────────────────────

const CATEGORY_META = {
  revisions: {
    label: 'Needs Revision',
    description: 'Tickets sent back with change requests.',
    accentColor: 'text-[#C84B0E]',
    borderColor: 'border-[#C84B0E]',
    filter: (t) => t.status === 'revisions',
    emptyMessage: 'No tickets currently need revision.',
  },
  new: {
    label: 'New — Ready to Start',
    description: 'Approved tickets with no time logged yet.',
    accentColor: 'text-primary-container',
    borderColor: 'border-primary-container',
    filter: (t) => t.status === 'in_progress' && (t.time_spent ?? 0) === 0,
    emptyMessage: 'No new tickets ready to start.',
  },
  'in-progress': {
    label: 'In Progress',
    description: 'Tickets you are actively working on.',
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-600',
    filter: (t) => t.status === 'in_progress' && (t.time_spent ?? 0) > 0,
    emptyMessage: 'No tickets currently in progress.',
  },
  pending: {
    label: 'Pending Approval',
    description: 'Draft tickets awaiting admin review and assignment.',
    accentColor: 'text-on-surface-variant',
    borderColor: 'border-on-surface-variant',
    filter: (t) => t.status === 'draft',
    emptyMessage: 'No tickets pending approval.',
  },
  resolved: {
    label: 'Resolved',
    description: 'Tickets you have completed and submitted for review.',
    accentColor: 'text-emerald-600',
    borderColor: 'border-emerald-600',
    filter: (t) => t.status === 'resolved',
    emptyMessage: 'No resolved tickets yet.',
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

const MemberTicketCategoryList = ({ category }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const meta = CATEGORY_META[category]

  useEffect(() => {
    if (!user) return
    const cached = getCachedTickets(user.id)
    if (cached) {
      setTickets(cached)
      setLoading(false)
      return
    }
    ticketsApi
      .list({ assignee_id: user.id })
      .then((res) => {
        const data = res.data ?? []
        setCachedTickets(user.id, data)
        setTickets(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = meta ? tickets.filter(meta.filter) : []

  // Guard: unknown category slug — should not happen with explicit routes, but be safe
  if (!meta) {
    return null
  }

  return (
    <div className="flex">
      <Sidebar role="member" />
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-surface-container-low flex-1">

        {/* Top bar */}
        <header className="fixed top-0 right-0 h-14 left-0 md:left-[240px] bg-white flex justify-between items-center px-8 z-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <button
              onClick={() => navigate('/member/tickets')}
              className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium"
            >
              Tickets
            </button>
            <span
              className="material-symbols-outlined text-on-surface-variant/40 text-base select-none"
              aria-hidden="true"
            >
              chevron_right
            </span>
            <span className="text-sm font-semibold text-on-surface">{meta.label}</span>
          </nav>
          <NotificationBell />
        </header>

        <div className="pt-14 p-8 max-w-[1400px] mx-auto w-full">

          {/* Category header */}
          <div className={`mb-8 border-l-4 pl-4 ${meta.borderColor}`}>
            <h1 className={`text-2xl font-extrabold tracking-tighter ${meta.accentColor}`}>
              {meta.label}
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">{meta.description}</p>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 px-5 py-4 bg-error-container text-on-error-container text-sm rounded-xl" role="alert">
              {error}
            </div>
          )}

          {/* Ticket table */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50">
                  {['Title / Project', 'Firm', 'Priority', 'Est.', 'Spent', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[11px] font-bold tracking-wider text-on-surface-variant uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant animate-pulse">
                      Loading tickets…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                      <p className="text-sm font-medium">{meta.emptyMessage}</p>
                      <button
                        onClick={() => navigate('/member/tickets')}
                        className="mt-3 text-xs font-bold text-primary-container hover:opacity-80 transition-opacity uppercase tracking-wider"
                      >
                        Back to all categories
                      </button>
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((t) => <TicketRow key={t.id} ticket={t} />)}
              </tbody>
            </table>

            {/* Footer count */}
            {!loading && (
              <div className="px-6 py-4 bg-surface-container-lowest border-t border-surface-container-low">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default MemberTicketCategoryList
