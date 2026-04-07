import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import AssignApproveModal from '../../components/modals/AssignApproveModal'
import CreateTicketModal from '../../components/modals/CreateTicketModal'
import EditTicketModal from '../../components/modals/EditTicketModal'
import RegenerateTicketModal from '../../components/modals/RegenerateTicketModal'
import Toast from '../../components/Toast'
import { firmsApi, ticketsApi, formatDate, timeAgo, getStatusBadges } from '../../lib/api'

const RECENT_THRESHOLD_MS = 15 * 60 * 1000

const isRecent = (isoDate) => {
  if (!isoDate) return false
  return Date.now() - new Date(isoDate).getTime() < RECENT_THRESHOLD_MS
}

const FirmTickets = () => {
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

  const itemsPerPage = 10
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTickets,
    goToPage,
  } = usePagination(tickets, itemsPerPage, initialPage)

  const handlePageChange = (page) => {
    goToPage(page)
    setSearchParams({ page: page.toString() })
  }

  const loadData = useCallback((archived = false) => {
    setLoading(true)
    Promise.all([
      firmsApi.get(id),
      ticketsApi.list({ firm_id: id, archived }),
    ])
      .then(([firmRes, ticketsRes]) => {
        setFirm(firmRes.data)
        setTickets(ticketsRes.data ?? [])
        goToPage(1)
        setSearchParams({ page: '1' })
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
    const targetId = deleteTargetId
    try {
      await ticketsApi.deleteTicket(targetId)
      setDeleteTargetId(null)
      setTickets((prev) => prev.filter((t) => t.id !== targetId))
    } catch (err) {
      setActionError(err.message)
      setDeleteTargetId(null)
    }
  }

  const handleDeleteCancel = () => setDeleteTargetId(null)

  const handleDiscardConfirm = async () => {
    if (!discardTargetId) return
    const targetId = discardTargetId
    setActionError(null)
    try {
      await ticketsApi.discard(targetId)
      setDiscardTargetId(null)
      setTickets((prev) => prev.map((t) => t.id === targetId ? { ...t, status: 'discarded' } : t))
    } catch (err) {
      setDiscardTargetId(null)
      setActionError(err.message)
    }
  }

  const handleDiscardCancel = () => setDiscardTargetId(null)

  const handleArchive = async (ticketId) => {
    setArchivingId(ticketId)
    setActionError(null)
    try {
      await ticketsApi.archive(ticketId, true)
      setToastMsg('Ticket archived')
      setShowToast(true)
      // When viewing non-archived list, archived ticket disappears
      setTickets((prev) => showArchived
        ? prev.map((t) => t.id === ticketId ? { ...t, archived: true } : t)
        : prev.filter((t) => t.id !== ticketId)
      )
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
      // When viewing archived list, unarchived ticket disappears
      setTickets((prev) => showArchived
        ? prev.filter((t) => t.id !== ticketId)
        : prev.map((t) => t.id === ticketId ? { ...t, archived: false } : t)
      )
    } catch (err) {
      setActionError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleApproveComplete = async ({ assignee_id, priority, assigneeName, deadline, project_id }) => {
    setActionError(null)
    try {
      await ticketsApi.assignApprove(selectedTicket.id, { assignee_id, priority, deadline, project_id })
      setToastMsg(`Ticket assigned to ${assigneeName}`)
      setShowToast(true)
      setTickets((prev) => prev.map((t) =>
        t.id === selectedTicket.id
          ? { ...t, status: 'in_progress', assignee_id, priority: priority || t.priority, deadline: deadline || t.deadline }
          : t
      ))
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleSaveEdit = async (data) => {
    setActionError(null)
    try {
      await ticketsApi.update(selectedTicket.id, data)
      setShowEditModal(false)
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? { ...t, ...data } : t))
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleCreateSuccess = () => {
    // Full reload needed — new ticket data requires joined fields from the API
    loadData(showArchived)
  }

  const handleRegenerateComplete = async ({ instruction }) => {
    setActionError(null)
    try {
      const res = await ticketsApi.regenerate(selectedTicket.id, { additional_instruction: instruction })
      setShowRegenerateModal(false)
      if (res?.data) {
        setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? { ...t, ...res.data } : t))
      }
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading tickets…</p>
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
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant pl-12 md:pl-0 flex-wrap">
          <Link to="/admin/firms" className="hover:text-primary transition-colors">Firms</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link
            to={`/admin/firms/${id}`}
            className="hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-none"
          >
            {firm.name}
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface">All Tickets</span>
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
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-on-surface-variant text-base">business</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{firm.name}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 lg:mb-3">
                All Tickets
              </h1>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">confirmation_number</span>
                  <span>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="bg-primary-container text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Ticket
              </button>
            </div>
          </div>

          {/* Discard confirmation modal */}
          {discardTargetId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-2xl">warning</span>
                  <h3 className="text-base font-bold text-on-surface">Discard Ticket?</h3>
                </div>
                <p className="text-sm text-on-surface-variant">This ticket will be marked as discarded. This action cannot be undone.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="px-4 py-2 text-sm font-bold rounded-lg border border-outline-variant/60 text-on-surface hover:bg-slate-50 transition-colors"
                    onClick={handleDiscardCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-bold bg-error text-white rounded-lg hover:brightness-110 transition-all"
                    onClick={handleDiscardConfirm}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteTargetId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-2xl">delete_forever</span>
                  <h3 className="text-base font-bold text-on-surface">Delete Ticket?</h3>
                </div>
                <p className="text-sm text-on-surface-variant">Permanently deletes this ticket and all its time logs. <strong>This cannot be undone.</strong></p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 text-sm font-bold rounded-lg border border-outline-variant/60 text-on-surface hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 text-sm font-bold bg-error text-white rounded-lg hover:brightness-110 transition-all"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          )}

          {actionError && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
              {actionError}
            </div>
          )}

          {/* Archive toggle */}
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

          {/* Ticket Cards */}
          <div className="flex flex-col gap-4">
            {tickets.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">confirmation_number</span>
                <p className="text-sm text-on-surface-variant italic">
                  {showArchived ? 'No archived tickets for this firm.' : 'No tickets for this firm yet.'}
                </p>
                {!showArchived && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-1 text-primary-container font-bold text-sm hover:underline"
                  >
                    + Add the first ticket
                  </button>
                )}
              </div>
            )}

            {paginatedTickets.map((ticket) => {
              const assignee = ticket.assignee ?? null
              return (
                <div
                  key={ticket.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl flex items-stretch transition-all hover:shadow-lg hover:shadow-black/5 overflow-hidden"
                >
                  <div className={`w-1.5 shrink-0 ${
                    ticket.status === 'in_progress'         ? 'bg-blue-500'
                    : ticket.status === 'resolved'          ? 'bg-teal-600'
                    : ticket.status === 'internal_review'   ? 'bg-violet-500'
                    : ticket.status === 'client_review'     ? 'bg-indigo-500'
                    : ticket.status === 'compliance_review' ? 'bg-amber-500'
                    : ticket.status === 'approved'          ? 'bg-emerald-600'
                    : ticket.status === 'closed'            ? 'bg-emerald-700'
                    : ticket.status === 'revisions'         ? 'bg-orange-500'
                    : ticket.status === 'discarded'         ? 'bg-red-400'
                    : 'bg-gray-400'
                  }`} />

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
        firmId={id}
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

export default FirmTickets
