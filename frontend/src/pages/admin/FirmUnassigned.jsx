import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Pagination from '../../components/Pagination'
import usePagination from '../../hooks/usePagination'
import AssignApproveModal from '../../components/modals/AssignApproveModal'
import EditTicketModal from '../../components/modals/EditTicketModal'
import RegenerateTicketModal from '../../components/modals/RegenerateTicketModal'
import Toast from '../../components/Toast'
import { firmsApi, ticketsApi, timeAgo, getStatusBadges } from '../../lib/api'

const RECENT_THRESHOLD_MS = 15 * 60 * 1000

const isRecent = (isoDate) => {
  if (!isoDate) return false
  return Date.now() - new Date(isoDate).getTime() < RECENT_THRESHOLD_MS
}

const FirmUnassigned = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [firm, setFirm] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [discardTargetId, setDiscardTargetId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [showToast, setShowToast] = useState(false)

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

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      firmsApi.get(id),
      ticketsApi.list({ firm_id: id }),
    ])
      .then(([firmRes, ticketsRes]) => {
        setFirm(firmRes.data)
        const all = ticketsRes.data ?? []
        const unassigned = all.filter(
          (t) => !t.assignee_id && !t.archived && t.status !== 'discarded'
        )
        setTickets(unassigned)
        goToPage(1)
        setSearchParams({ page: '1' })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

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
    setActionError(null)
    setDiscardTargetId(ticketId)
  }

  const handleDiscardConfirm = async () => {
    if (!discardTargetId) return
    const targetId = discardTargetId
    setActionError(null)
    try {
      await ticketsApi.discard(targetId)
      setDiscardTargetId(null)
      // Discarded tickets are no longer unassigned — remove from view
      setTickets((prev) => prev.filter((t) => t.id !== targetId))
    } catch (err) {
      setDiscardTargetId(null)
      setActionError(err.message)
    }
  }

  const handleDiscardCancel = () => setDiscardTargetId(null)

  const handleApproveComplete = async ({ assignee_id, priority, assigneeName, deadline, project_id }) => {
    setActionError(null)
    try {
      await ticketsApi.assignApprove(selectedTicket.id, { assignee_id, priority, deadline, project_id })
      setToastMsg(`Ticket assigned to ${assigneeName}`)
      setShowToast(true)
      // Assigned ticket no longer belongs in the unassigned view
      setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id))
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
          <p className="text-on-surface-variant animate-pulse">Loading unassigned tickets…</p>
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
          <span className="text-on-surface">Unassigned</span>
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
                <span className="material-symbols-outlined text-amber-500 text-base">person_off</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{firm.name}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 lg:mb-3">
                Unassigned Tickets
              </h1>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-base ${tickets.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {tickets.length}
                  </span>
                  <span>{tickets.length === 1 ? 'ticket needs' : 'tickets need'} assignment</span>
                </div>
              </div>
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

          {actionError && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
              {actionError}
            </div>
          )}

          {/* Ticket Cards */}
          <div className="flex flex-col gap-4">
            {tickets.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                <p className="text-sm text-on-surface-variant font-medium">
                  All tickets are assigned for this firm.
                </p>
                <Link
                  to={`/admin/firms/${id}/tickets`}
                  className="mt-1 text-primary-container font-bold text-sm hover:underline"
                >
                  View all tickets
                </Link>
              </div>
            )}

            {paginatedTickets.map((ticket) => (
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
                    {/* Primary CTA: Assign & Approve — prominent amber accent for this page */}
                    <button
                      className="px-4 py-1.5 text-xs font-bold bg-primary-container text-white rounded-lg hover:brightness-110 transition-all"
                      onClick={() => handleAssignApprove(ticket)}
                    >
                      Assign &amp; Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

export default FirmUnassigned
