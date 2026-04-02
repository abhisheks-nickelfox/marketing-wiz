import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import AssignApproveModal from '../../components/modals/AssignApproveModal'
import CreateTicketModal from '../../components/modals/CreateTicketModal'
import EditTicketModal from '../../components/modals/EditTicketModal'
import RegenerateTicketModal from '../../components/modals/RegenerateTicketModal'
import { firmsApi, ticketsApi, formatDate, timeAgo, getStatusBadges } from '../../lib/api'
import Toast from '../../components/Toast'

const RECENT_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

const isRecent = (isoDate) => {
  if (!isoDate) return false
  return Date.now() - new Date(isoDate).getTime() < RECENT_THRESHOLD_MS
}


const FirmDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [firm, setFirm] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [discardTargetId, setDiscardTargetId] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivingId, setArchivingId] = useState(null)

  // Pagination setup - 10 items per page
  const itemsPerPage = 10
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTickets,
    goToPage,
  } = usePagination(tickets, itemsPerPage, initialPage)

  // Update URL when page changes
  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  // Single combined fetch — both firm metadata and tickets are loaded in parallel
  // so stats are never dropped because of a race between two separate effects.
  const loadData = useCallback((archived = false) => {
    setLoading(true)
    Promise.all([firmsApi.get(id), ticketsApi.list({ firm_id: id, archived })])
      .then(([firmRes, ticketsRes]) => {
        const ticketList = ticketsRes.data ?? []
        setTickets(ticketList)
        // Reset to page 1 when data reloads
        goToPage(1)
        setSearchParams({ page: '1' })
        // Compute stats and merge them into the firm object in one setState call
        const stats = {
          total:             ticketList.length,
          new:               ticketList.filter((t) => t.status === 'draft').length,
          in_progress:       ticketList.filter((t) => t.status === 'in_progress').length,
          resolved:          ticketList.filter((t) => t.status === 'resolved').length,
          internal_review:   ticketList.filter((t) => t.status === 'internal_review').length,
          client_review:     ticketList.filter((t) => t.status === 'client_review').length,
          compliance_review: ticketList.filter((t) => t.status === 'compliance_review').length,
          approved:          ticketList.filter((t) => t.status === 'approved').length,
          closed:            ticketList.filter((t) => t.status === 'closed').length,
          revisions:         ticketList.filter((t) => t.status === 'revisions').length,
          discarded:         ticketList.filter((t) => t.status === 'discarded').length,
        }
        setFirm({ ...firmRes.data, stats })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData(showArchived)
  }, [loadData, showArchived])


  const handleAssignApprove = (ticket) => {
    setSelectedTicket(ticket)
    setActionError(null)
    setShowAssignModal(true)
  }

  const handleEdit = (ticket) => {
    setSelectedTicket(ticket)
    setActionError(null)
    setShowEditModal(true)
  }

  const handleRegenerate = (ticket) => {
    setSelectedTicket(ticket)
    setActionError(null)
    setShowRegenerateModal(true)
  }

  const handleDiscard = (ticketId) => {
    setDeleteTargetId(null)
    setActionError(null)
    setDiscardTargetId(ticketId)
  }

  const handleDeletePermanent = (ticketId) => {
    setDiscardTargetId(null)
    setDeleteTargetId(ticketId)
  }
  const handleDeleteConfirm = async () => {
    try {
      await ticketsApi.deleteTicket(deleteTargetId)
      setDeleteTargetId(null)
      loadData()
    } catch (err) {
      setActionError(err.message)
      setDeleteTargetId(null)
    }
  }
  const handleDeleteCancel = () => setDeleteTargetId(null)

  const handleDiscardConfirm = async () => {
    if (!discardTargetId) return
    setActionError(null)
    try {
      await ticketsApi.discard(discardTargetId)
      setDiscardTargetId(null)
      loadData()
    } catch (err) {
      setDiscardTargetId(null)
      setActionError(err.message)
    }
  }

  const handleDiscardCancel = () => {
    setDiscardTargetId(null)
  }

  const handleArchive = async (ticketId) => {
    setArchivingId(ticketId)
    setActionError(null)
    try {
      await ticketsApi.archive(ticketId, true)
      setToastMsg('Ticket archived')
      setShowToast(true)
      loadData(showArchived)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleUnarchive = async (ticketId) => {
    setArchivingId(ticketId)
    setActionError(null)
    try {
      await ticketsApi.archive(ticketId, false)
      setToastMsg('Ticket unarchived')
      setShowToast(true)
      loadData(showArchived)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleApproveComplete = async ({ assignee_id, priority, assigneeName, deadline }) => {
    setActionError(null)
    try {
      await ticketsApi.assignApprove(selectedTicket.id, { assignee_id, priority, deadline })
      loadData()
      setToastMsg(`Ticket assigned to ${assigneeName}`)
      setShowToast(true)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleSaveEdit = async (data) => {
    setActionError(null)
    try {
      await ticketsApi.update(selectedTicket.id, data)
      loadData()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleCreateSuccess = () => {
    loadData()
  }

  const handleRegenerateComplete = async ({ instruction }) => {
    setActionError(null)
    try {
      await ticketsApi.regenerate(selectedTicket.id, { additional_instruction: instruction })
      loadData()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading firm...</p>
        </main>
      </div>
    )
  }

  if (error || !firm) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-error">{error ?? 'Firm not found'}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-14 bg-surface flex justify-between items-center px-4 sm:px-8 lg:px-12 z-40">
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant pl-12 md:pl-0">
          <Link to="/admin/firms" className="hover:text-primary">Firms</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface truncate max-w-[150px] sm:max-w-none">{firm.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">notifications</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-0 md:ml-[240px] pt-14 min-h-screen bg-surface flex-1">
        <div className="px-4 sm:px-8 lg:px-12 py-6 lg:py-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 lg:mb-3">
                {firm.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-on-surface-variant">
                {firm.contact_email && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">mail</span>
                    <span>{firm.contact_email}</span>
                  </div>
                )}
                {firm.contact_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">person</span>
                    <span>{firm.contact_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  <span>Added {formatDate(firm.created_at)}</span>
                </div>
              </div>
            </div>
            <button
              className="bg-primary-container text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-primary transition-colors flex items-center gap-2 shrink-0"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="material-symbols-outlined text-base">add</span>
              Create Ticket
            </button>
          </div>

          {/* Stats bar */}
          {firm.stats && (
            <div className="flex flex-wrap gap-3 mb-6 lg:mb-8">
              {[
                { label: 'Total',         value: firm.stats.total,             color: 'bg-surface-container-high text-on-surface-variant', status: null },
                { label: 'New',           value: firm.stats.new,               color: 'bg-surface-container-high text-on-surface-variant', status: 'draft' },
                { label: 'In Progress',   value: firm.stats.in_progress,       color: 'bg-blue-100 text-blue-700',                         status: 'in_progress' },
                { label: 'Resolved',      value: firm.stats.resolved,          color: 'bg-teal-100 text-teal-700',                         status: 'resolved' },
                { label: 'Int. Review',   value: firm.stats.internal_review,   color: 'bg-violet-100 text-violet-700',                     status: 'internal_review' },
                { label: 'Client Review', value: firm.stats.client_review,     color: 'bg-indigo-100 text-indigo-700',                     status: 'client_review' },
                { label: 'Compliance',    value: firm.stats.compliance_review, color: 'bg-amber-100 text-amber-700',                       status: 'compliance_review' },
                { label: 'Approved',      value: firm.stats.approved,          color: 'bg-emerald-100 text-emerald-700',                   status: 'approved' },
                { label: 'Closed',        value: firm.stats.closed,            color: 'bg-emerald-200 text-emerald-800',                   status: 'closed' },
                { label: 'Revisions',     value: firm.stats.revisions,         color: 'bg-orange-100 text-orange-700',                     status: 'revisions' },
                { label: 'Discarded',     value: firm.stats.discarded,         color: 'bg-red-100 text-red-500',                           status: 'discarded' },
              ].filter((s) => s.value > 0 || s.label === 'Total').map((s) => (
                <button
                  key={s.label}
                  onClick={() =>
                    s.status
                      ? navigate(`/admin/tickets?firm_id=${id}&status=${s.status}`)
                      : navigate(`/admin/tickets?firm_id=${id}`)
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:brightness-95 transition-all ${s.color}`}
                >
                  <span>{s.label}</span>
                  <span className="text-sm font-extrabold">{s.value}</span>
                </button>
              ))}
            </div>
          )}

          {discardTargetId && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm flex items-center justify-between gap-4">
              <span>Discard this ticket? This action cannot be undone.</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="px-4 py-1.5 text-xs font-bold rounded-lg border border-on-error-container/30 hover:bg-error/10 transition-colors"
                  onClick={handleDiscardCancel}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-1.5 text-xs font-bold bg-error text-white rounded-lg hover:brightness-110 transition-all"
                  onClick={handleDiscardConfirm}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          {deleteTargetId && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg shrink-0">warning</span>
                <span>Permanently delete this ticket? All time logs will also be removed. <strong>This cannot be undone.</strong></span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleDeleteCancel} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors">Cancel</button>
                <button onClick={handleDeleteConfirm} className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:brightness-110 transition-all">Delete Forever</button>
              </div>
            </div>
          )}
          {actionError && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
              {actionError}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-transparent mb-8 lg:mb-10">
            <div className="flex gap-8">
              <button className="pb-3 text-sm font-bold text-primary relative">
                Tickets
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
              </button>
            </div>
            <button
              onClick={() => setShowArchived((prev) => !prev)}
              className={`mb-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                showArchived
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>

          {/* Archived view back button */}
          {showArchived && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowArchived(false)}
                className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Tickets
              </button>
              <span className="text-xs font-bold bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-full uppercase tracking-wider">
                Archived
              </span>
            </div>
          )}

          {/* Tickets List */}
          <div className="flex flex-col gap-4">
            {tickets.length === 0 && (
              <p className="text-sm text-on-surface-variant italic text-center py-8">
                {showArchived ? 'No archived tickets for this firm.' : 'No tickets for this firm yet.'}
              </p>
            )}
            {paginatedTickets.map((ticket) => {
              const assignee = ticket.assignee ?? null
              return (
                <div
                  key={ticket.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl flex items-stretch transition-all hover:shadow-lg hover:shadow-black/5 overflow-hidden"
                >
                  <div className={`w-1.5 shrink-0 ${
                    ticket.status === 'in_progress'       ? 'bg-blue-500'
                    : ticket.status === 'resolved'        ? 'bg-teal-600'
                    : ticket.status === 'internal_review' ? 'bg-violet-500'
                    : ticket.status === 'client_review'   ? 'bg-indigo-500'
                    : ticket.status === 'compliance_review' ? 'bg-amber-500'
                    : ticket.status === 'approved'        ? 'bg-emerald-600'
                    : ticket.status === 'closed'          ? 'bg-emerald-700'
                    : ticket.status === 'revisions'       ? 'bg-orange-500'
                    : ticket.status === 'discarded'       ? 'bg-red-400'
                    : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 p-4 lg:p-5 flex flex-col gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
                        <h3 className="text-sm lg:text-base font-bold text-on-surface">{ticket.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadges(ticket).map(({ label, style }) => (
                            <span key={label} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style}`}>
                              {label}
                            </span>
                          ))}
                          {(ticket.status === 'in_progress' || ticket.status === 'draft') && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              ticket.priority === 'urgent' ? 'bg-red-100 text-red-700'
                              : ticket.priority === 'high' ? 'bg-red-50 text-red-600'
                              : ticket.priority === 'normal' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {ticket.priority}
                            </span>
                          )}
                          {!ticket.ai_generated && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
                              Manual
                            </span>
                          )}
                          {isRecent(ticket.created_at) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#C84B0E] text-white">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">
                          {ticket.description}
                        </p>
                      )}
                      <p className="text-[10px] text-on-surface-variant/60 font-medium mb-2">
                        Created {timeAgo(ticket.created_at)}
                      </p>
                      {assignee && (
                        <div className="flex items-center gap-2 bg-surface-container-low px-2 py-1 rounded-full border border-outline-variant/20 w-fit">
                          <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-white text-[9px] font-bold">
                            {assignee.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-on-surface">{assignee.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {ticket.status === 'draft' && (
                        <>
                          <button
                            className="px-3 py-1.5 text-xs font-bold text-on-surface border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors"
                            onClick={() => handleEdit(ticket)}
                          >
                            Edit
                          </button>
                          {ticket.ai_generated && (
                            <button
                              className="px-3 py-1.5 text-xs font-bold text-on-surface border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors"
                              onClick={() => handleRegenerate(ticket)}
                            >
                              Regenerate
                            </button>
                          )}
                          <button
                            className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error/5 rounded-lg transition-colors"
                            onClick={() => handleDiscard(ticket.id)}
                          >
                            Discard
                          </button>
                          <button
                            className="px-4 py-1.5 text-xs font-bold bg-primary-container text-white rounded-lg hover:brightness-110 transition-all"
                            onClick={() => handleAssignApprove(ticket)}
                          >
                            Assign &amp; Approve
                          </button>
                        </>
                      )}
                      {ticket.status !== 'draft' && (
                        <Link
                          to={`/admin/tickets/${ticket.id}`}
                          className="px-4 py-1.5 text-xs font-bold text-primary-container border border-primary-container/30 rounded-lg hover:bg-primary-container/5 transition-colors flex items-center gap-1"
                        >
                          View Details
                        </Link>
                      )}
                      {ticket.status === 'discarded' && !ticket.archived && (
                        <button
                          onClick={() => handleDeletePermanent(ticket.id)}
                          className="text-xs font-bold text-error hover:text-error/80 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete_forever</span>
                          Delete
                        </button>
                      )}
                      {/* Archive / Unarchive */}
                      {ticket.archived ? (
                        <>
                          <button
                            onClick={() => handleUnarchive(ticket.id)}
                            disabled={archivingId === ticket.id}
                            className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">unarchive</span>
                            Unarchive
                          </button>
                          <button
                            onClick={() => handleDeletePermanent(ticket.id)}
                            className="text-xs font-bold text-error hover:text-error/80 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleArchive(ticket.id)}
                          disabled={archivingId === ticket.id}
                          className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">archive</span>
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {tickets.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxPageButtons={5}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        firmId={id}
        onSuccess={handleCreateSuccess}
      />
      <AssignApproveModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        ticket={selectedTicket}
        onApprove={handleApproveComplete}
      />
      <EditTicketModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        ticket={selectedTicket}
        onSave={handleSaveEdit}
      />
      <RegenerateTicketModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        ticket={selectedTicket}
        onRegenerate={handleRegenerateComplete}
      />
      <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  )
}

export default FirmDetail
