import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import { teamApi, formatDate, formatHours, timeAgo } from '../../lib/api'

const MemberDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pagination for tickets - 10 per page
  const ticketsPerPage = 10
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTickets,
    goToPage,
  } = usePagination(member?.tickets || [], ticketsPerPage)

  useEffect(() => {
    teamApi
      .get(id)
      .then((res) => setMember(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-error-container text-on-error-container',
      urgent: 'bg-error-container text-on-error-container',
      normal: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      low: 'bg-surface-container-high text-on-surface-variant',
    }
    return styles[priority] || styles.normal
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading member...</p>
        </main>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-error">{error ?? 'Member not found'}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex flex-col flex-1">
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 w-full bg-[#F9F9F7] flex justify-between items-center h-16 lg:h-20 px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant pl-12 md:pl-0">
            <Link to="/admin/team" className="hover:text-primary">Team</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-on-surface truncate max-w-[150px] sm:max-w-none">{member.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to={`/admin/team/${member.id}/edit`}
              className="bg-primary-container text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-primary transition-colors shadow-sm active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span className="hidden sm:inline">Edit Member</span>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="px-4 sm:px-8 lg:px-12 py-6 lg:py-8 flex-1 max-w-7xl mx-auto w-full">
          {/* Member Profile Header */}
          <section className="mb-10 lg:mb-16">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              {/* Left Column - Profile Info */}
              <div className="lg:w-1/3 flex flex-col items-center lg:items-start space-y-6">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-primary-container flex items-center justify-center text-white font-black text-4xl lg:text-5xl mb-6">
                    {member.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
                    {member.name}
                  </h1>
                  <p className="text-zinc-500 mb-3 text-base">{member.email}</p>
                  <span className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {member.role?.toUpperCase() ?? 'MEMBER'}
                  </span>
                  <div className="mt-6 flex flex-col gap-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      <span>
                        <span className="font-bold uppercase tracking-widest text-[10px]">Joined</span>{' '}
                        {formatDate(member.created_at)}
                      </span>
                    </div>
                    {member.updated_at && member.updated_at !== member.created_at && (
                      <div className="flex items-center gap-2" title={member.updated_at}>
                        <span className="material-symbols-outlined text-base">update</span>
                        <span>
                          <span className="font-bold uppercase tracking-widest text-[10px]">Last updated</span>{' '}
                          {timeAgo(member.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Card */}
                <div className="w-full bg-surface-container-low rounded-xl p-6 lg:p-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-6">Statistics</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Assigned</p>
                      <p className="text-3xl lg:text-4xl font-black text-primary-container">
                        {member.assigned_count ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Pending</p>
                      <p className="text-3xl lg:text-4xl font-black text-on-surface">
                        {member.pending_count ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Resolved</p>
                      <p className="text-3xl lg:text-4xl font-black text-primary-container">
                        {member.resolved_count ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Hours</p>
                      <p className="text-3xl lg:text-4xl font-black text-on-surface">
                        {member.total_hours_logged != null ? `${member.total_hours_logged}h` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Firms Involved */}
                {(member.firms_involved ?? []).length > 0 && (
                  <div className="w-full">
                    <h3 className="text-base lg:text-lg font-bold tracking-tight text-on-surface mb-4">
                      Firms Involved
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {member.firms_involved.map((firm) => (
                        <div
                          key={firm.firm_name}
                          className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest rounded-xl border border-surface-container-low"
                        >
                          <span className="text-sm font-semibold text-on-surface">{firm.firm_name}</span>
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full">
                            {firm.ticket_count} ticket{firm.ticket_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Tickets */}
              <div className="lg:w-2/3">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-on-surface mb-2">
                      Assigned Tickets
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {(member.tickets ?? []).length} total ticket{(member.tickets ?? []).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/tickets?assignee_id=${member.id}`)}
                    className="text-primary-container font-semibold text-sm hover:underline flex items-center gap-1"
                  >
                    View all
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>

                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container-low">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-surface-container-low">
                        <tr>
                          {['Ticket', 'Priority', 'Status', 'Firm', 'Est. Hours', 'Time Spent'].map((h) => (
                            <th key={h} className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low">
                        {(member.tickets ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                              No tickets assigned
                            </td>
                          </tr>
                        ) : (
                          paginatedTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors">
                              <td className="px-4 lg:px-6 py-4 lg:py-5">
                                <Link
                                  to={`/admin/tickets/${ticket.id}`}
                                  className="text-sm font-bold text-on-surface hover:text-primary line-clamp-1"
                                >
                                  {ticket.title}
                                </Link>
                                <p className="text-xs text-on-surface-variant mt-1">{ticket.firm_name ?? '—'}</p>
                              </td>
                              <td className="px-4 lg:px-6 py-4 lg:py-5">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getPriorityBadge(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 lg:py-5">
                                <span className="text-xs font-medium text-on-surface-variant capitalize">
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-on-surface-variant">
                                {ticket.firm_name ?? '—'}
                              </td>
                              <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-on-surface-variant">
                                {ticket.estimated_hours ? formatHours(ticket.estimated_hours) : '—'}
                              </td>
                              <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-on-surface-variant">
                                {ticket.time_spent ? formatHours(ticket.time_spent) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination for Tickets */}
                {(member.tickets ?? []).length > ticketsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    maxPageButtons={7}
                  />
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-auto py-6 px-4 sm:px-12 text-[10px] text-zinc-400 uppercase tracking-widest text-center lg:text-left">
          MarketingWiz Admin © 2025
        </footer>
      </main>
    </div>
  )
}

export default MemberDetail
