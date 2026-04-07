import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { dashboardApi, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const getPriorityBadge = (priority) => {
  const styles = {
    urgent: 'bg-on-error-container text-error font-extrabold',
    high: 'bg-error/10 text-error',
    normal: 'bg-tertiary/10 text-tertiary',
    low: 'bg-surface-container-high text-on-surface-variant/50',
  }
  return styles[priority] || styles.normal
}

const calcDaysOverdue = (ticket) => {
  if (ticket.deadline) {
    return Math.round((Date.now() - new Date(ticket.deadline).getTime()) / 86400000)
  }
  return Math.max(
    0,
    Math.round((Date.now() - new Date(ticket.updated_at).getTime()) / 86400000) - 7
  )
}

const TicketCard = ({ ticket }) => {
  const navigate = useNavigate()
  const daysOverdue = calcDaysOverdue(ticket)
  const deadlineLabel = ticket.deadline ? formatDate(ticket.deadline) : 'No deadline'

  return (
    <article
      className="bg-surface-container-lowest rounded-xl border-l-4 border-error p-4 flex flex-col gap-3"
      aria-label={`Overdue ticket: ${ticket.title}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-error uppercase tracking-widest">
          OVERDUE {daysOverdue}D
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadge(ticket.priority)}`}
          >
            {ticket.priority}
          </span>
          <span className="text-[10px] text-error/70 font-semibold flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
              calendar_today
            </span>
            {deadlineLabel}
          </span>
        </div>
      </div>

      <h3 className="font-bold text-sm leading-snug text-on-surface">{ticket.title}</h3>

      <p className="text-xs text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          business
        </span>
        {ticket.firms?.name ?? ticket.firm_name ?? 'Unknown firm'}
        <span className="mx-1 text-on-surface-variant/30">&middot;</span>
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          person
        </span>
        {ticket.assignee?.name ?? ticket.assignee_name ?? 'Unassigned'}
      </p>

      <div className="pt-1">
        <button
          onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
          className="inline-flex items-center gap-1 text-primary-container font-semibold text-xs hover:underline"
        >
          View
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </div>
    </article>
  )
}

const SectionEmptyState = ({ label }) => (
  <p className="text-sm text-on-surface-variant py-4">{label}</p>
)

const OverdueTickets = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardApi
      .overdueTickets()
      .then((res) => setTickets(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const pastDeadline = tickets
    .filter((t) => t.overdue_type === 'past_deadline')
    .sort((a, b) => {
      // most overdue first = earliest deadline first
      const da = a.deadline ? new Date(a.deadline).getTime() : 0
      const db = b.deadline ? new Date(b.deadline).getTime() : 0
      return da - db
    })

  const staleApproved = tickets
    .filter((t) => t.overdue_type === 'stale_approved')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex-1 flex items-center justify-center pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse text-sm">Loading overdue tickets…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex-1">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/10 flex justify-between items-center px-4 sm:px-8 h-16">
          <div className="pl-12 md:pl-0 flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Back to dashboard"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold text-on-surface">Overdue Tickets</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-on-surface-variant hidden sm:block">
              {user?.name ?? 'Admin'}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'AD'}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-12 max-w-[1200px] mx-auto space-y-8 lg:space-y-12">
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="px-6 py-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium"
            >
              {error}
            </div>
          )}

          {/* All-clear empty state */}
          {!error && tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span
                className="material-symbols-outlined text-emerald-500 text-[48px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                check_circle
              </span>
              <p className="text-lg font-bold text-on-surface">All tickets are on track</p>
              <p className="text-sm text-on-surface-variant">No overdue tickets right now.</p>
            </div>
          )}

          {tickets.length > 0 && (
            <>
              {/* Summary strip */}
              <section
                className="grid grid-cols-2 gap-4 sm:gap-6"
                aria-label="Overdue ticket summary"
              >
                <div className="bg-surface-container-lowest rounded-xl border-l-4 border-error p-4 sm:p-6">
                  <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                    Past Deadline
                  </span>
                  <p className="text-3xl font-extrabold tracking-tight mt-2 text-error">
                    {pastDeadline.length}
                  </p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl border-l-4 border-amber-500 p-4 sm:p-6">
                  <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                    Stale Approved
                  </span>
                  <p className="text-3xl font-extrabold tracking-tight mt-2 text-amber-500">
                    {staleApproved.length}
                  </p>
                </div>
              </section>

              {/* Past Deadline section */}
              <section aria-labelledby="past-deadline-heading">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    id="past-deadline-heading"
                    className="text-base font-bold tracking-tight text-on-surface uppercase"
                  >
                    Past Deadline
                  </h2>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {pastDeadline.length} ticket{pastDeadline.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {pastDeadline.length === 0 ? (
                  <SectionEmptyState label="No tickets past their deadline." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastDeadline.map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </section>

              {/* Stale Approved section */}
              <section aria-labelledby="stale-approved-heading">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    id="stale-approved-heading"
                    className="text-base font-bold tracking-tight text-on-surface uppercase"
                  >
                    Stale Approved
                  </h2>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {staleApproved.length} ticket{staleApproved.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {staleApproved.length === 0 ? (
                  <SectionEmptyState label="No stale approved tickets." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staleApproved.map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default OverdueTickets
