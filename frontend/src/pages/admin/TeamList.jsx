import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import { teamApi, formatDate, formatHours, timeAgo } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const TeamList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null) // member to confirm delete
  const [deleting, setDeleting] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter team members based on search
  const filtered = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination for team members - 10 per page
  const teamPerPage = 10
  const teamInitialPage = parseInt(searchParams.get('teamPage') || '1', 10)
  const {
    currentPage: teamCurrentPage,
    totalPages: teamTotalPages,
    paginatedItems: paginatedTeam,
    goToPage: teamGoToPage,
  } = usePagination(filtered, teamPerPage, teamInitialPage)

  // Pagination for member tickets - 5 per page
  const ticketsPerPage = 5
  const ticketsInitialPage = parseInt(searchParams.get('ticketsPage') || '1', 10)
  const {
    currentPage: ticketsCurrentPage,
    totalPages: ticketsTotalPages,
    paginatedItems: paginatedTickets,
    goToPage: ticketsGoToPage,
  } = usePagination(selectedMember?.tickets || [], ticketsPerPage, ticketsInitialPage)

  // Reset team pagination when search changes
  useEffect(() => {
    teamGoToPage(1)
    const params = new URLSearchParams(searchParams)
    params.set('teamPage', '1')
    setSearchParams(params)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when team page changes
  const handleTeamPageChange = (page) => {
    teamGoToPage(page)
    const params = new URLSearchParams(searchParams)
    params.set('teamPage', page.toString())
    setSearchParams(params)
  }

  // Update URL when tickets page changes
  const handleTicketsPageChange = (page) => {
    ticketsGoToPage(page)
    const params = new URLSearchParams(searchParams)
    params.set('ticketsPage', page.toString())
    setSearchParams(params)
  }

  // Load the member list on mount; auto-select the first member by setting state
  // directly — no call to handleViewMember so there is no stale-closure dependency.
  useEffect(() => {
    teamApi
      .list()
      .then((res) => {
        const members = res.data ?? []
        setTeamMembers(members)
        if (members.length > 0) setSelectedMember(members[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch full member profile (includes tickets) whenever selectedMember changes.
  // This covers both the initial auto-select above and manual row clicks.
  useEffect(() => {
    if (!selectedMember) return
    setLoadingProfile(true)
    // Reset tickets pagination when selecting a new member
    ticketsGoToPage(1)
    const params = new URLSearchParams(searchParams)
    params.set('ticketsPage', '1')
    setSearchParams(params)
    
    teamApi
      .get(selectedMember.id)
      .then((res) => setSelectedMember(res.data))
      .catch(console.error)
      .finally(() => setLoadingProfile(false))
  }, [selectedMember?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch full member profile (includes tickets) when selecting
  const handleViewMember = (member) => {
    setSelectedMember(member) // triggers the effect above
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await teamApi.delete(deleteConfirm.id)
      setTeamMembers((prev) => prev.filter((m) => m.id !== deleteConfirm.id))
      if (selectedMember?.id === deleteConfirm.id) setSelectedMember(null)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-error-container text-on-error-container',
      urgent: 'bg-error-container text-on-error-container',
      normal: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      low: 'bg-surface-container-high text-on-surface-variant',
    }
    return styles[priority] || styles.normal
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex flex-col flex-1">
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 w-full bg-[#F9F9F7] flex justify-between items-center h-16 lg:h-20 px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4 lg:gap-8 flex-1 pl-12 md:pl-0">
            <h2 className="font-bold text-xl lg:text-2xl tracking-tighter text-on-background shrink-0">Team</h2>
            <div className="relative max-w-xs lg:max-w-md w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                search
              </span>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container/20"
                placeholder="Search team members..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin/team/new"
              className="bg-primary-container text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-bold text-sm tracking-tight flex items-center gap-2 hover:bg-primary transition-colors shadow-sm active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span className="hidden sm:inline">Add Member</span>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="px-4 sm:px-8 lg:px-12 py-6 lg:py-8 flex-1 max-w-7xl mx-auto w-full">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>
          )}

          {/* Team Table */}
          <section className="mb-10 lg:mb-16">
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {['Name', 'Role', 'Email', 'Assigned', 'Pending', 'Resolved', 'Joined', 'Action'].map((h) => (
                        <th
                          key={h}
                          className={`px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant${h === 'Action' ? ' text-right' : ''}${['Email', 'Joined'].includes(h) ? ' hidden sm:table-cell' : ''}${['Pending', 'Resolved'].includes(h) ? ' hidden md:table-cell' : ''}${h === 'Role' ? ' hidden sm:table-cell' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {loading && (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant animate-pulse">
                          Loading team…
                        </td>
                      </tr>
                    )}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">
                          No team members found
                        </td>
                      </tr>
                    )}
                    {paginatedTeam.map((member) => (
                      <tr
                        key={member.id}
                        className="bg-surface-container-lowest hover:bg-surface-container transition-colors duration-200"
                      >
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          <button
                            onClick={() => handleViewMember(member)}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left w-full"
                          >
                            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {member.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-on-surface text-sm hover:text-primary transition-colors">
                              {member.name}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 hidden sm:table-cell">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            member.role === 'admin'
                              ? 'bg-primary-container/10 text-primary-container'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {member.role ?? 'member'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-sm text-on-surface-variant hidden sm:table-cell">{member.email}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 font-bold text-on-surface">{member.assigned_count ?? 0}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-on-surface-variant hidden md:table-cell">{member.pending_count ?? 0}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-on-surface-variant hidden md:table-cell">{member.resolved_count ?? 0}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-sm text-on-surface-variant hidden sm:table-cell">{formatDate(member.created_at)}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                          {isSuperAdmin && member.id !== user?.id && (
                            <button
                              onClick={() => setDeleteConfirm(member)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                              title="Delete user"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                          <Link
                            to={`/admin/team/${member.id}`}
                            className={`${
                              selectedMember?.id === member.id
                                ? 'bg-primary-container text-white px-4 py-1.5 rounded-lg'
                                : 'text-primary font-bold'
                            } text-xs font-bold hover:underline transition-all active:scale-[0.98]`}
                          >
                            View
                          </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination for Team Members */}
            <Pagination
              currentPage={teamCurrentPage}
              totalPages={teamTotalPages}
              onPageChange={handleTeamPageChange}
              maxPageButtons={5}
            />
          </section>

          {/* Expanded Profile */}
          {selectedMember && (
            <>
              <div className="relative flex py-6 lg:py-8 items-center">
                <div className="flex-grow border-t border-surface-container-high"></div>
                <span className="flex-shrink mx-6 text-[11px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                  Member Profile
                </span>
                <div className="flex-grow border-t border-surface-container-high"></div>
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-10 gap-8 lg:gap-12 mt-4">
                {/* Left Column */}
                <div className="lg:col-span-4 flex flex-col items-center lg:items-start space-y-6 lg:space-y-8">
                  <div className="flex flex-col items-center lg:items-start">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-primary-container flex items-center justify-center text-white font-black text-3xl lg:text-4xl mb-4 lg:mb-6">
                      {selectedMember.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tighter text-on-surface">{selectedMember.name}</h3>
                    <p className="text-zinc-500 mt-1 mb-3 text-sm">{selectedMember.email}</p>
                    <span className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {selectedMember.role?.toUpperCase() ?? 'MEMBER'}
                    </span>
                    <div className="mt-4 flex flex-col gap-1 text-xs text-zinc-400">
                      <span>
                        <span className="font-bold uppercase tracking-widest text-[9px]">Joined</span>{' '}
                        {formatDate(selectedMember.created_at)}
                      </span>
                      {selectedMember.updated_at &&
                        selectedMember.updated_at !== selectedMember.created_at && (
                        <span title={selectedMember.updated_at}>
                          <span className="font-bold uppercase tracking-widest text-[9px]">Last updated</span>{' '}
                          {timeAgo(selectedMember.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-8 lg:gap-12 py-5 lg:py-6 px-6 lg:px-8 bg-surface-container-low rounded-xl w-full justify-between">
                    <div className="text-center lg:text-left">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Assigned</p>
                      <p className="text-2xl lg:text-3xl font-black text-primary-container">
                        {selectedMember.assigned_count ?? 0}
                      </p>
                    </div>
                    <div className="text-center lg:text-left">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pending</p>
                      <p className="text-2xl lg:text-3xl font-black text-on-surface">{selectedMember.pending_count ?? 0}</p>
                    </div>
                    <div className="text-center lg:text-left">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Resolved</p>
                      <p className="text-2xl lg:text-3xl font-black text-primary-container">{selectedMember.resolved_count ?? 0}</p>
                    </div>
                    <div className="text-center lg:text-left">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Hours</p>
                      <p className="text-2xl lg:text-3xl font-black text-on-surface">
                        {selectedMember.total_hours_logged != null ? `${selectedMember.total_hours_logged}h` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full pt-2 flex flex-col gap-3">
                    <Link
                      to={`/admin/team/${selectedMember.id}/edit`}
                      className="w-full flex items-center justify-center gap-2 bg-primary-container text-white py-3 px-6 rounded-xl font-bold text-sm hover:bg-primary transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit Member Profile
                    </Link>
                    {isSuperAdmin && selectedMember.id !== user?.id && (
                      <button
                        onClick={() => setDeleteConfirm(selectedMember)}
                        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-3 px-6 rounded-xl font-bold text-sm hover:bg-red-50 transition-all active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Delete User
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column — Tickets */}
                <div className="lg:col-span-6">
                  <div className="flex justify-between items-end mb-4 lg:mb-6">
                    <h4 className="text-lg lg:text-xl font-bold tracking-tight text-on-surface">Active Ticket Breakdown</h4>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">All Time</span>
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container-low">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[400px]">
                        <thead className="bg-surface-container-low">
                          <tr>
                            {['Ticket', 'Priority', 'Status', 'Firm', 'Est. Hours', 'Time Spent'].map((h) => (
                              <th key={h} className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                          {loadingProfile ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant text-sm animate-pulse">
                                Loading tickets…
                              </td>
                            </tr>
                          ) : (selectedMember.tickets ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                                No tickets assigned
                              </td>
                            </tr>
                          ) : (
                            paginatedTickets.map((ticket) => (
                              <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors">
                                <td className="px-4 lg:px-6 py-4 lg:py-5">
                                  <p className="text-sm font-bold text-on-surface line-clamp-1">{ticket.title}</p>
                                  <p className="text-xs text-on-surface-variant">{ticket.firm_name ?? '—'}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-4 lg:py-5">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getPriorityBadge(ticket.priority)}`}>
                                    {ticket.priority}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 lg:py-5">
                                  <span className="text-xs font-medium text-on-surface-variant capitalize">{ticket.status}</span>
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

                  {/* Pagination for Member Tickets */}
                  {!loadingProfile && (selectedMember.tickets ?? []).length > ticketsPerPage && (
                    <Pagination
                      currentPage={ticketsCurrentPage}
                      totalPages={ticketsTotalPages}
                      onPageChange={handleTicketsPageChange}
                      maxPageButtons={5}
                    />
                  )}

                  {!loadingProfile && (selectedMember.tickets ?? []).length > 0 && (
                    <div className="mt-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/tickets?assignee_id=${selectedMember.id}`)}
                        className="text-primary-container font-semibold text-sm hover:underline"
                      >
                        View all tickets →
                      </button>
                    </div>
                  )}

                  {!loadingProfile && (selectedMember.firms_involved ?? []).length > 0 && (
                    <div className="mt-8 lg:mt-10">
                      <h4 className="text-base lg:text-lg font-bold tracking-tight text-on-surface mb-4">Firms Involved</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedMember.firms_involved.map((firm) => (
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
              </section>
            </>
          )}
        </div>

        <footer className="mt-auto py-6 px-4 sm:px-12 text-[10px] text-zinc-400 uppercase tracking-widest text-center lg:text-left">
          MarketingWiz Admin © 2025
        </footer>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-red-500">warning</span>
            </div>
            <h3 className="font-extrabold text-xl text-on-surface mb-2">Delete User</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Permanently delete <strong>{deleteConfirm.name}</strong>? This removes their account and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamList
