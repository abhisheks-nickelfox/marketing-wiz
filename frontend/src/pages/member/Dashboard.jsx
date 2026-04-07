import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import { dashboardApi, formatHours, timeAgo, getStatusBadges } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const MemberDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashData, setDashData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardApi
      .member()
      .then((res) => setDashData(res.data))
      .catch((err) => setError(err.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const recentTickets = dashData?.recent_tickets ?? []
  const totalAssigned = dashData?.total_assigned ?? 0
  const pendingTickets = dashData?.pending_tickets ?? 0
  const totalHours = dashData?.total_hours_logged ?? 0

  const getPriorityColor = (p) => {
    const m = {
      urgent: 'bg-error-container text-on-error-container',
      high: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      normal: 'bg-surface-variant text-on-surface-variant',
      low: 'bg-surface-variant text-on-surface-variant',
    }
    return m[p] || m.normal
  }

  if (loading) {
    return (
      <div className="flex overflow-hidden">
        <Sidebar role="member" />
        <main className="flex-1 ml-0 md:ml-[240px] min-h-screen flex items-center justify-center">
          <p className="text-on-surface-variant animate-pulse">Loading dashboard…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden">
      <Sidebar role="member" />
      <main className="flex-1 ml-0 md:ml-[240px] min-h-screen relative overflow-y-auto">
        {/* TOP NAVIGATION */}
        <header className="flex justify-between items-center w-full px-12 py-6 bg-surface">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Overview</h2>
            {/* search — not yet implemented */}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-3 border-l border-outline-variant/20">
              <span className="text-sm font-medium text-on-surface hidden sm:block">{user?.name ?? 'Member'}</span>
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.slice(0, 2).toUpperCase() ?? 'MR'}
              </div>
            </div>
          </div>
        </header>

        {/* ERROR BANNER */}
        {error && (
          <div className="mx-12 mt-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* CONTENT */}
        <div className="px-12 pb-12 space-y-12">
          {/* STATS ROW */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-container-lowest p-8 rounded-xl border-l-[6px] border-tertiary shadow-sm transition-transform hover:scale-[1.01] duration-200">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
                Total Assigned
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tighter text-on-surface">{totalAssigned}</span>
                <span className="text-xs font-medium text-on-surface-variant/40">Active Tickets</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl border-l-[6px] border-primary-container shadow-sm transition-transform hover:scale-[1.01] duration-200">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
                Pending Actions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tighter text-on-surface">
                  {String(pendingTickets).padStart(2, '0')}
                </span>
                {pendingTickets > 0 && (
                  <span className="text-xs font-bold text-error">Requires Focus</span>
                )}
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl border-l-[6px] border-emerald-600 shadow-sm transition-transform hover:scale-[1.01] duration-200">
              <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
                Total Hours Logged
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tighter text-on-surface">{formatHours(totalHours)}</span>
                <span className="text-xs font-medium text-on-surface-variant/40">All Time</span>
              </div>
            </div>
          </section>

          {/* 2-COLUMN GRID */}
          <section className="grid grid-cols-12 gap-12 items-start">
            {/* TODAY'S FOCUS — recent tickets from API */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold tracking-tight text-on-surface">Today's Focus</h3>
                <button
                  onClick={() => navigate('/member/tickets')}
                  className="text-sm font-semibold text-primary-container hover:underline"
                >
                  View all work
                </button>
              </div>
              <div className="bg-surface-container-low rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 px-6 py-4 bg-surface-container-high text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                  <div className="col-span-2">Priority</div>
                  <div className="col-span-5">Ticket &amp; Firm</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {recentTickets.length === 0 && (
                    <div className="px-6 py-8 text-sm text-on-surface-variant text-center">
                      No tickets assigned yet
                    </div>
                  )}
                  {recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="grid grid-cols-12 px-6 py-5 bg-surface-container-lowest hover:bg-surface-container-low transition-colors items-center group"
                    >
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <button
                          className="font-bold text-on-surface text-sm group-hover:text-primary-container transition-colors text-left"
                          onClick={() => navigate(`/member/tickets/${ticket.id}`)}
                        >
                          {ticket.title}
                        </button>
                        <p className="text-xs text-on-surface-variant/60">{ticket.firms?.name}{ticket.project?.name ? ` · ${ticket.project.name}` : ''}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm font-bold text-on-surface-variant">{getStatusBadges(ticket)[0].label}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => navigate(`/member/tickets/${ticket.id}`)}
                          className="p-2 hover:bg-surface-container-high rounded-full"
                        >
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Summary */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold tracking-tight text-on-surface">Summary</h3>
                <span className="material-symbols-outlined text-on-surface-variant/40">analytics</span>
              </div>
              <div className="bg-surface-container-low p-6 rounded-xl border-t-4 border-tertiary">
                <p className="text-sm font-bold text-on-surface mb-4">Ticket Breakdown</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Total Assigned</span>
                    <span className="font-bold">{totalAssigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Pending Approval</span>
                    <span className="font-bold text-amber-600">{pendingTickets}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Total Hours Logged</span>
                    <span className="font-bold text-primary-container">{totalHours}h</span>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">Quick Links</p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/member/tickets')}
                    className="w-full flex items-center gap-3 text-sm font-medium text-on-surface hover:text-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    View All Tickets
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

    </div>
  )
}

export default MemberDashboard
