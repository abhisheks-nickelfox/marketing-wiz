import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { dashboardApi, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

// Static lookup maps — Tailwind's scanner cannot see dynamically assembled class strings
// (e.g. `border-${color}`), so every variant must be spelled out in full here.
const STAT_BORDER = {
  'primary-container': 'border-primary-container',
  'gray-300': 'border-gray-300',
  'amber-500': 'border-amber-500',
  'emerald-500': 'border-emerald-500',
  'blue-500': 'border-blue-500',
}

const STAT_ICON_COLOR = {
  'primary-container': 'text-primary-container',
  'gray-300': 'text-gray-300',
  'amber-500': 'text-amber-500',
  'emerald-500': 'text-emerald-500',
  'blue-500': 'text-blue-500',
}


const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashData, setDashData] = useState(null)
  const [overdueData, setOverdueData] = useState([])
  const [teamWorkload, setTeamWorkload] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([dashboardApi.admin(), dashboardApi.overdueTickets(), dashboardApi.teamWorkload()])
      .then(([dash, overdue, workload]) => {
        setDashData(dash.data)
        setOverdueData(overdue.data ?? [])
        setTeamWorkload(workload.data ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = dashData
    ? [
        { label: 'TOTAL FIRMS', value: dashData.total_firms, color: 'primary-container', icon: 'trending_up', href: '/admin/firms' },
        { label: 'TOTAL TICKETS', value: dashData.total_tickets, color: 'gray-300', href: '/admin/tickets' },
        { label: 'PENDING TICKETS', value: dashData.pending_tickets, color: 'amber-500', icon: 'circle', href: '/admin/tickets?status=draft' },
        { label: 'APPROVED', value: dashData.approved_tickets, color: 'emerald-500', icon: 'check_circle', href: '/admin/tickets?status=approved' },
        { label: 'TEAM MEMBERS', value: dashData.team_members, color: 'blue-500', icon: 'group', href: '/admin/team' },
      ]
    : []

  const recentTranscripts = dashData?.recent_transcripts ?? []

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex-1 flex items-center justify-center pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading dashboard…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex-1">
        {/* Top Nav */}
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/10 flex justify-between items-center px-4 sm:px-8 h-16">
          <div className="pl-12 md:pl-0 flex items-center gap-4">
            <h2 className="text-lg font-bold text-on-surface">Dashboard</h2>
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

        <div className="p-4 sm:p-6 lg:p-12 max-w-[1600px] mx-auto space-y-8 lg:space-y-12">
          {/* Error Banner */}
          {error && (
            <div className="px-6 py-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* ROW 1: Stat Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                onClick={() => navigate(stat.href)}
                className={`group bg-surface-container-lowest p-4 lg:p-6 rounded-xl border-l-4 ${STAT_BORDER[stat.color]} hover:bg-surface-container-low transition-all duration-300 cursor-pointer`}
              >
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                  {stat.label}
                </span>
                <div className="flex items-baseline mt-2">
                  <span className="text-2xl lg:text-3xl font-extrabold tracking-tight">{stat.value?.toLocaleString() ?? '—'}</span>
                  {stat.icon && (
                    <span
                      className={`material-symbols-outlined ${STAT_ICON_COLOR[stat.color]} ml-auto`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {stat.icon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* ROW 2: Recent Transcripts */}
          <section className="bg-surface-container-lowest rounded-xl overflow-hidden">
            <div className="p-6 lg:p-8 flex items-center justify-between">
              <h3 className="text-lg lg:text-xl font-bold tracking-tight">Recent Transcripts</h3>
              <button
                onClick={() => navigate('/admin/transcripts')}
                className="text-primary-container font-semibold text-sm hover:underline flex items-center"
              >
                View All
                <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-surface-container-high">
                  <tr>
                    <th className="px-4 sm:px-8 py-4 text-[11px] font-bold text-on-surface-variant tracking-[0.05em] uppercase">Call Title</th>
                    <th className="px-4 sm:px-8 py-4 text-[11px] font-bold text-on-surface-variant tracking-[0.05em] uppercase">Date</th>
                    <th className="px-4 sm:px-8 py-4 text-[11px] font-bold text-on-surface-variant tracking-[0.05em] uppercase hidden sm:table-cell">Participants</th>
                    <th className="px-4 sm:px-8 py-4 text-[11px] font-bold text-on-surface-variant tracking-[0.05em] uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {recentTranscripts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-6 text-sm text-on-surface-variant text-center">
                        No transcripts yet
                      </td>
                    </tr>
                  )}
                  {recentTranscripts.map((t) => {
                    const participantsArr = Array.isArray(t.participants) ? t.participants : []
                    return (
                      <tr key={t.id} className="hover:bg-surface-container-low transition-colors duration-200">
                        <td className="px-4 sm:px-8 py-5">
                          <div className="font-medium text-on-surface text-sm">{t.title}</div>
                        </td>
                        <td className="px-4 sm:px-8 py-5 text-on-surface-variant text-sm">{formatDate(t.call_date)}</td>
                        <td className="px-4 sm:px-8 py-5 hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">group</span>
                            <span className="text-sm text-on-surface-variant">{participantsArr.length}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-5 text-right">
                          <button
                            onClick={() => navigate(`/admin/transcripts/process?id=${t.id}`)}
                            className="bg-primary-container text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-all"
                          >
                            Process
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ROW 3: Workload & Overdue */}
          <section className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8">
            {/* Team Workload */}
            <div className="lg:col-span-6 bg-surface-container-lowest rounded-xl p-6 lg:p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h3 className="text-lg lg:text-xl font-bold tracking-tight">Team Workload</h3>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {teamWorkload.length} Members
                </span>
              </div>
              <div className="space-y-5">
                {teamWorkload.length === 0 && (
                  <p className="text-sm text-on-surface-variant">No team members yet</p>
                )}
                {teamWorkload.map((member) => {
                  const active = member.pending ?? 0
                  const resolved = member.resolved ?? 0
                  const total = member.assigned ?? 0
                  const hours = member.total_hours ?? 0
                  const barColor = active > 6 ? 'bg-error' : active > 3 ? 'bg-amber-500' : 'bg-emerald-500'
                  const barPct = total > 0 ? Math.round((active / total) * 100) : 0
                  return (
                    <div key={member.user.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {member.user.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm text-on-surface truncate">{member.user.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{active} Active</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">{resolved} Done</span>
                          <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] font-bold">{hours.toFixed(1)}h</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }}></div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant/60 font-medium w-16 text-right shrink-0">
                          {active} of {total} active
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Overdue Tickets */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 lg:p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h3 className="text-lg lg:text-xl font-bold tracking-tight">Overdue Tickets</h3>
                {overdueData.length > 0 && (
                  <span className="bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {overdueData.length}
                  </span>
                )}
              </div>
              <div className="flex-grow space-y-4 mb-6">
                {overdueData.length === 0 && (
                  <p className="text-sm text-on-surface-variant">No overdue tickets</p>
                )}
                {overdueData.slice(0, 3).map((ticket) => {
                  const daysOverdue = ticket.deadline
                    ? Math.round((Date.now() - new Date(ticket.deadline).getTime()) / 86400000)
                    : Math.max(0, Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 86400000) - 7)
                  const deadlineLabel = ticket.deadline
                    ? new Date(ticket.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : null
                  return (
                    <div key={ticket.id} className="p-4 bg-surface-container-low border-l-4 border-error rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-error uppercase tracking-widest">
                          OVERDUE {daysOverdue}D
                        </span>
                        {deadlineLabel && (
                          <span className="text-[10px] text-error/70 font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                            {deadlineLabel}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm mt-1 leading-tight">{ticket.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-2 flex items-center">
                        <span className="material-symbols-outlined text-[14px] mr-1">person</span>
                        {ticket.assignee?.name ?? 'Unassigned'}
                      </p>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate('/admin/tickets')}
                className="w-full py-3 rounded-lg border border-outline text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors"
              >
                View Overdue Tickets
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
