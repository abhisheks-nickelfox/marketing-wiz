import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import { ticketsApi, formatHours } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { getCachedTickets, setCachedTickets } from '../../lib/memberTicketsCache'

const CATEGORIES = [
  {
    key: 'revisions',
    label: 'Needs Revision',
    description: 'Tickets sent back with change requests from your team lead.',
    route: '/member/tickets/revisions',
    borderColor: 'border-[#C84B0E]',
    countColor: 'text-[#C84B0E]',
    urgent: true,
  },
  {
    key: 'new',
    label: 'New — Ready to Start',
    description: 'Approved tickets waiting for your first time log entry.',
    route: '/member/tickets/new',
    borderColor: 'border-primary-container',
    countColor: 'text-on-surface',
    urgent: false,
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    description: 'Active tickets you have started logging time on.',
    route: '/member/tickets/in-progress',
    borderColor: 'border-blue-600',
    countColor: 'text-on-surface',
    urgent: false,
  },
  {
    key: 'pending',
    label: 'Pending Approval',
    description: 'Draft tickets awaiting admin review and assignment.',
    route: '/member/tickets/pending',
    borderColor: 'border-on-surface-variant',
    countColor: 'text-on-surface',
    urgent: false,
  },
  {
    key: 'resolved',
    label: 'Resolved',
    description: 'Tickets you have completed and submitted for review.',
    route: '/member/tickets/resolved',
    borderColor: 'border-emerald-600',
    countColor: 'text-on-surface',
    urgent: false,
  },
]

const getCategoryCount = (tickets, key) => {
  switch (key) {
    case 'revisions':   return tickets.filter((t) => t.status === 'revisions').length
    case 'new':         return tickets.filter((t) => t.status === 'in_progress' && (t.time_spent ?? 0) === 0).length
    case 'in-progress': return tickets.filter((t) => t.status === 'in_progress' && (t.time_spent ?? 0) > 0).length
    case 'pending':     return tickets.filter((t) => t.status === 'draft').length
    case 'resolved':    return tickets.filter((t) => t.status === 'resolved').length
    default:            return 0
  }
}

const MemberTicketList = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const totalAssigned  = tickets.length
  const totalHours     = tickets.reduce((sum, t) => sum + (t.time_spent ?? 0), 0)
  const inReviewCount  = tickets.filter((t) =>
    ['internal_review', 'client_review', 'compliance_review', 'approved'].includes(t.status)
  ).length
  const closedCount    = tickets.filter((t) => t.status === 'closed').length

  return (
    <div className="flex">
      <Sidebar role="member" />
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-surface-container-low flex-1">

        {/* Top bar */}
        <header className="fixed top-0 right-0 h-14 left-0 md:left-[240px] bg-white flex justify-between items-center px-8 z-10">
          <h1 className="font-semibold text-zinc-900 text-lg">Tickets</h1>
          <NotificationBell />
        </header>

        <div className="pt-14 p-8 max-w-[1400px] mx-auto w-full">

          {/* Metric strip — shows aggregate stats not duplicated by category cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10" aria-label="Ticket summary">
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary-container">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Total Assigned</p>
              <span className="text-3xl font-bold text-on-surface">
                {loading ? '—' : totalAssigned}
              </span>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-tertiary">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Hours Logged</p>
              <span className="text-3xl font-bold text-on-surface">
                {loading ? '—' : formatHours(totalHours)}
              </span>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-violet-500">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">In Review</p>
              <span className="text-3xl font-bold text-on-surface">
                {loading ? '—' : inReviewCount}
              </span>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-zinc-400">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Closed</p>
              <span className="text-3xl font-bold text-on-surface">
                {loading ? '—' : closedCount}
              </span>
            </div>
          </section>

          {/* Error state */}
          {error && (
            <div className="mb-6 px-5 py-4 bg-error-container text-on-error-container text-sm rounded-xl" role="alert">
              {error}
            </div>
          )}

          {/* Section heading */}
          <div className="mb-6">
            <h2 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">Browse by Category</h2>
          </div>

          {/* Category cards grid */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            aria-label="Ticket categories"
          >
            {CATEGORIES.map((cat) => {
              const count = loading ? null : getCategoryCount(tickets, cat.key)
              const isEmpty = count === 0
              const isUrgentActive = cat.urgent && count !== null && count > 0

              return (
                <button
                  key={cat.key}
                  onClick={() => navigate(cat.route)}
                  disabled={loading}
                  aria-label={`${cat.label}: ${count ?? 'loading'} ticket${count !== 1 ? 's' : ''}`}
                  className={[
                    'bg-surface-container-lowest rounded-xl p-6 border-l-4 cursor-pointer text-left',
                    'hover:scale-[1.01] transition-transform shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
                    'flex flex-col gap-3 w-full',
                    cat.borderColor,
                    isEmpty ? 'opacity-60' : '',
                    isUrgentActive ? 'ring-2 ring-[#C84B0E]/30' : '',
                    loading ? 'pointer-events-none' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Count + arrow row */}
                  <div className="flex items-start justify-between">
                    <span className={`text-4xl font-extrabold tracking-tighter ${cat.countColor}`}>
                      {loading ? (
                        <span className="inline-block w-10 h-9 bg-surface-container-high rounded animate-pulse" aria-hidden="true" />
                      ) : count}
                    </span>
                    <span
                      className="material-symbols-outlined text-on-surface-variant/50 mt-1 select-none"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </div>

                  {/* Label */}
                  <p className="text-sm font-bold text-on-surface leading-tight">{cat.label}</p>

                  {/* Description */}
                  <p className="text-xs text-on-surface-variant/60 leading-relaxed">{cat.description}</p>
                </button>
              )
            })}
          </section>
        </div>
      </main>
    </div>
  )
}

export default MemberTicketList
