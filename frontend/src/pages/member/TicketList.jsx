import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import { ticketsApi, formatHours, getStatusBadges } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const getPriorityColor = (priority) => {
  const m = {
    urgent: 'bg-error-container text-on-error-container',
    high: 'bg-error-container text-on-error-container',
    normal: 'bg-surface-container-highest text-on-surface-variant',
    low: 'bg-surface-container-highest text-on-surface-variant',
  }
  return m[priority] || m.normal
}

const getStatusDot = (status) => {
  const m = {
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
  }
  return m[status] ?? 'bg-outline-variant'
}


const TicketRow = ({ ticket }) => {
  const spent = ticket.time_spent ?? 0
  return (
    <tr className="hover:bg-surface-container-low transition-colors cursor-pointer">
      <td className="px-6 py-5">
        <Link to={`/member/tickets/${ticket.id}`} className="flex items-center gap-3">
          <span className="material-symbols-outlined text-outline-variant text-sm">description</span>
          <span className="font-semibold text-sm text-on-surface">{ticket.title}</span>
        </Link>
      </td>
      <td className="px-6 py-5 text-sm text-on-surface-variant">{ticket.firms?.name ?? '—'}</td>
      <td className="px-6 py-5">
        <span className={`px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-tighter ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-6 py-5 text-sm font-medium text-on-surface">
        {formatHours(ticket.estimated_hours)}
      </td>
      <td className="px-6 py-5 text-sm font-medium text-on-surface">
        {spent > 0 ? `${spent.toFixed(1)}h` : '—'}
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(ticket.status)}`}></div>
          {getStatusBadges(ticket).map(({ label }) => (
            <span key={label} className="text-xs font-semibold text-on-surface-variant">{label}</span>
          ))}
        </div>
      </td>
    </tr>
  )
}

const MemberTicketList = () => {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    ticketsApi
      .list({ assignee_id: user.id })
      .then((res) => setTickets(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const activeTickets = tickets.filter((t) => t.status === 'in_progress')
  const revisionTickets = tickets.filter((t) => t.status === 'revisions')
  const draftTickets = tickets.filter((t) => t.status === 'draft')
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved')
  const totalAssigned = tickets.length
  const inProgress = activeTickets.length

  return (
    <div className="flex">
      <Sidebar role="member" />
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-surface-container-low flex-1">
        {/* TopNavBar */}
        <header className="fixed top-0 right-0 h-[56px] left-0 md:left-[240px] bg-white flex justify-between items-center px-8 w-full md:w-[calc(100%-240px)] z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-zinc-900 text-lg">Tickets</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Main Content */}
        <div className="pt-[56px] p-8 max-w-[1400px] mx-auto w-full">
          {/* Metric Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary-container">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Total Assigned</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-on-surface">{totalAssigned}</span>
                <span className="text-xs text-on-surface-variant font-medium">Tickets</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-tertiary">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">In Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-on-surface">
                  {String(inProgress).padStart(2, '0')}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">Active</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-orange-400">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Needs Revision</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-on-surface">{revisionTickets.length}</span>
                <span className="text-xs text-on-surface-variant font-medium">Sent Back</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-emerald-600">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Resolved</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-on-surface">
                  {tickets.filter((t) => t.status === 'resolved').length}
                </span>
                <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-8 mb-8 border-b border-surface-container-high">
            <button className="pb-4 text-sm font-bold text-primary-container border-b-2 border-primary-container">
              My Tickets
            </button>
          </div>

          {/* Ticket Table */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-surface-container-high">
            {error && (
              <div className="px-6 py-4 bg-error-container text-on-error-container text-sm">{error}</div>
            )}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50">
                  {['Title', 'Firm', 'Priority', 'Est. Time', 'Spent Time', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
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
                {!loading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                      No tickets assigned to you yet
                    </td>
                  </tr>
                )}

                {/* Active (in_progress) tickets */}
                {activeTickets.length > 0 && (
                  <>
                    <tr className="bg-surface-container-low/20">
                      <td className="px-6 py-2 text-[10px] font-extrabold text-primary uppercase tracking-[0.15em]" colSpan="7">
                        Active Tickets
                      </td>
                    </tr>
                    {activeTickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
                  </>
                )}

                {/* Revision tickets */}
                {revisionTickets.length > 0 && (
                  <>
                    <tr className="bg-surface-container-low/20">
                      <td className="px-6 py-2 text-[10px] font-extrabold text-orange-500 uppercase tracking-[0.15em]" colSpan="7">
                        Needs Revision
                      </td>
                    </tr>
                    {revisionTickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
                  </>
                )}

                {/* Draft tickets */}
                {draftTickets.length > 0 && (
                  <>
                    <tr className="bg-surface-container-low/20">
                      <td className="px-6 py-2 text-[10px] font-extrabold text-primary uppercase tracking-[0.15em]" colSpan="7">
                        Draft / Pending Approval
                      </td>
                    </tr>
                    {draftTickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
                  </>
                )}

                {/* Resolved tickets */}
                {resolvedTickets.length > 0 && (
                  <>
                    <tr className="bg-surface-container-low/20">
                      <td className="px-6 py-2 text-[10px] font-extrabold text-emerald-600 uppercase tracking-[0.15em]" colSpan="7">
                        Resolved
                      </td>
                    </tr>
                    {resolvedTickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
                  </>
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="p-6 flex justify-between items-center bg-surface-container-lowest border-t border-surface-container-low">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                Showing {tickets.length} of {tickets.length} tickets
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MemberTicketList
