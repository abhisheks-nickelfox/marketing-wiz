import { useState, useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import { ticketsApi, firmsApi, teamApi, formatDate, formatHours, getStatusBadge } from '../../lib/api'

const getWorkStatus = (ticket) => {
  if (ticket.status === 'draft') return { label: 'Pending Approval', style: 'bg-surface-container-high text-on-surface-variant' }
  if (ticket.status === 'resolved') return { label: 'Done', style: 'bg-emerald-100 text-emerald-700' }
  if (ticket.status === 'discarded') return { label: 'Discarded', style: 'bg-red-100 text-red-500' }
  const spent = ticket.time_spent ?? 0
  if (spent > 0) return { label: 'In Progress', style: 'bg-blue-100 text-blue-700' }
  return { label: 'Not Started', style: 'bg-surface-container-high text-on-surface-variant' }
}

const AdminTicketList = () => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(location.search)
    return {
      firm_id: params.get('firm_id') ?? 'all',
      assignee_id: params.get('assignee_id') ?? 'anyone',
      status: params.get('status') ?? 'any',
      type: 'any',
      priority: 'any',
    }
  })
  const [tickets, setTickets] = useState([])
  const [firms, setFirms] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pagination setup - 15 items per page
  const itemsPerPage = 15
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(tickets, itemsPerPage, initialPage)

  const fetchTickets = (appliedFilters) => {
    setLoading(true)
    ticketsApi
      .list(appliedFilters)
      .then((res) => {
        setTickets(res.data ?? [])
        goToPage(1) // Reset to first page when filters change
        setSearchParams({ page: '1' })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  // Update URL when page changes
  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const initialFilters = {
      firm_id: params.get('firm_id') ?? 'all',
      assignee_id: params.get('assignee_id') ?? 'anyone',
      status: params.get('status') ?? 'any',
      type: 'any',
      priority: 'any',
    }
    fetchTickets(initialFilters)
    firmsApi.list().then((res) => setFirms(res.data ?? [])).catch(() => {})
    teamApi.list().then((res) => setTeamMembers(res.data ?? [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'bg-on-error-container text-error font-extrabold',
      high: 'bg-error/10 text-error',
      normal: 'bg-tertiary/10 text-tertiary',
      low: 'bg-surface-container-high text-on-surface-variant/50',
    }
    return styles[priority] || styles.normal
  }

  const handleApplyFilters = () => {
    fetchTickets(filters)
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      <main className="flex-1 ml-0 md:ml-[240px] min-h-screen flex flex-col">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-4 sm:px-8 lg:px-12 py-4 lg:py-6 sticky top-0 z-40 bg-[#F9F9F7]">
          <div className="pl-12 md:pl-0">
            <h2 className="text-xl lg:text-2xl font-bold tracking-[-0.02em] text-on-surface">All Tickets</h2>
            <p className="text-sm text-on-surface-variant mt-0.5 hidden sm:block">Manage and review campaign requests</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-on-surface-variant hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <section className="px-4 sm:px-8 lg:px-12 mb-6 lg:mb-8">
          <div className="bg-surface-container-lowest rounded-xl p-4 lg:p-6 shadow-sm border border-outline-variant/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {[
                {
                  label: 'Status',
                  key: 'status',
                  opts: [
                    ['any', 'Any Status'],
                    ['draft', 'Draft'],
                    ['approved', 'Approved'],
                    ['resolved', 'Resolved'],
                    ['discarded', 'Discarded'],
                  ],
                },
                {
                  label: 'Type',
                  key: 'type',
                  opts: [
                    ['any', 'Any Type'],
                    ['task', 'Task'],
                    ['design', 'Design'],
                    ['development', 'Development'],
                    ['account_management', 'Account Mgmt'],
                  ],
                },
                {
                  label: 'Priority',
                  key: 'priority',
                  opts: [
                    ['any', 'Any Priority'],
                    ['low', 'Low'],
                    ['normal', 'Normal'],
                    ['high', 'High'],
                    ['urgent', 'Urgent'],
                  ],
                },
              ].map(({ label, key, opts }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {label}
                  </label>
                  <select
                    className="bg-surface-container-low border-none rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary-container/20"
                    value={filters[key]}
                    onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                  >
                    {opts.map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Firm filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Firm
                </label>
                <select
                  className="bg-surface-container-low border-none rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary-container/20"
                  value={filters.firm_id}
                  onChange={(e) => setFilters({ ...filters, firm_id: e.target.value })}
                >
                  <option value="all">All Firms</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Assignee filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Assignee
                </label>
                <select
                  className="bg-surface-container-low border-none rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary-container/20"
                  value={filters.assignee_id}
                  onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value })}
                >
                  <option value="anyone">Anyone</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-end justify-end border-t border-outline-variant/10 pt-4">
              <button
                className="bg-primary-container text-white px-6 lg:px-8 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all active:scale-[0.98]"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="px-4 sm:px-8 lg:px-12 flex-1 pb-12">
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
            {error && (
              <div className="px-6 py-4 bg-error-container text-on-error-container text-sm">{error}</div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Title</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Firm</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Assigned To</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Type</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Priority</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-center hidden md:table-cell">Est. Time</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-center hidden md:table-cell">Time Spent</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Work Status</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Created</th>
                    <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading && (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-on-surface-variant text-sm animate-pulse">
                        Loading tickets…
                      </td>
                    </tr>
                  )}
                  {!loading && tickets.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                        No tickets found
                      </td>
                    </tr>
                  )}
                  {paginatedItems.map((ticket) => {
                    const assignee = ticket.assignee
                    return (
                      <tr key={ticket.id} className="hover:bg-surface-container-low transition-colors group">
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          <span className="text-sm font-semibold text-on-surface line-clamp-1">{ticket.title}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-sm text-on-surface-variant">
                          {ticket.firms?.name ?? '—'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                {assignee.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium truncate max-w-[80px] lg:max-w-none">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-on-surface-variant/60">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs font-medium capitalize hidden lg:table-cell">
                          {ticket.type?.replace('_', ' ')}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-center font-medium hidden md:table-cell">
                          {formatHours(ticket.estimated_hours)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-center font-medium hidden md:table-cell">
                          {ticket.time_spent ? formatHours(ticket.time_spent) : '—'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          {(() => {
                            const ws = getWorkStatus(ticket)
                            return (
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-tighter ${ws.style}`}>
                                {ws.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs text-on-surface-variant hidden lg:table-cell">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-right">
                          <Link
                            to={`/admin/tickets/${ticket.id}`}
                            className="text-primary-container font-bold text-xs hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <footer className="px-6 py-4 bg-surface-container-low/50 flex items-center justify-between border-t border-outline-variant/10">
              <p className="text-xs text-on-surface-variant font-medium">
                Showing {paginatedItems.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0}-{(currentPage - 1) * itemsPerPage + paginatedItems.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </p>
            </footer>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxPageButtons={7}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminTicketList
