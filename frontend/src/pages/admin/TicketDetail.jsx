import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import AssignApproveModal from '../../components/modals/AssignApproveModal'
import EditTicketModal from '../../components/modals/EditTicketModal'
import RegenerateTicketModal from '../../components/modals/RegenerateTicketModal'
import ResolveTicketModal from '../../components/modals/ResolveTicketModal'
import Toast from '../../components/Toast'
import { ticketsApi, formatDate, formatHours, timeAgo } from '../../lib/api'


const AdminTicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState(null)
  const [timeLogs, setTimeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  const loadData = useCallback(() => {
    Promise.all([ticketsApi.get(id), ticketsApi.getTimeLogs(id)])
      .then(([t, logs]) => {
        setTicket(t.data)
        setTimeLogs(logs.data ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const spentHours = timeLogs
    .filter((l) => l.log_type !== 'final')
    .reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0)
  const progress = ticket?.estimated_hours
    ? Math.min(100, Math.round((spentHours / ticket.estimated_hours) * 100))
    : 0

  const handleSaveEdit = async (data) => {
    setActionError(null)
    try {
      await ticketsApi.update(id, data)
      loadData()
      setEditSaved(true)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRegenerate = async ({ instruction }) => {
    setActionError(null)
    try {
      await ticketsApi.regenerate(id, { additional_instruction: instruction })
      loadData()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleAssignApprove = async ({ assignee_id, priority, deadline }) => {
    setActionError(null)
    try {
      await ticketsApi.assignApprove(id, { assignee_id, priority, deadline })
      loadData()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleDiscard = async () => {
    if (!window.confirm('Are you sure you want to discard this ticket?')) return
    setDiscarding(true)
    setActionError(null)
    try {
      await ticketsApi.discard(id)
      navigate('/admin/tickets')
    } catch (err) {
      setActionError(err.message)
      setDiscarding(false)
    }
  }

  const handleResolveConfirm = async ({ finalComment, hours }) => {
    setActionError(null)
    try {
      await ticketsApi.resolve(id, {
        final_comment: finalComment,
        estimated_hours: hours != null ? hours : undefined,
      })
      setIsResolveModalOpen(false)
      loadData()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const getWorkStatus = () => {
    if (ticket.status === 'draft') return { label: 'Pending Approval', style: 'bg-surface-container-high text-on-surface-variant' }
    if (ticket.status === 'resolved') return { label: 'Done', style: 'bg-emerald-100 text-emerald-700' }
    if (ticket.status === 'discarded') return { label: 'Discarded', style: 'bg-red-100 text-red-500' }
    if (spentHours > 0) return { label: 'In Progress', style: 'bg-blue-100 text-blue-700' }
    return { label: 'Not Started', style: 'bg-surface-container-high text-on-surface-variant' }
  }

  const getPriorityStyle = (p) => {
    const s = {
      urgent: 'bg-error-container text-on-error-container',
      high: 'bg-error/10 text-error',
      normal: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      low: 'bg-surface-container-high text-on-surface-variant',
    }
    return s[p] || s.normal
  }

  const getStatusStyle = (status) => {
    const s = {
      draft: 'bg-surface-container-high text-on-surface-variant',
      approved: 'bg-emerald-100 text-emerald-700',
      resolved: 'bg-teal-100 text-teal-700',
      discarded: 'bg-red-100 text-red-500',
    }
    return s[status] || s.draft
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface-container-low flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-on-surface-variant animate-pulse">Loading ticket…</p>
        </main>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen bg-surface-container-low flex items-center justify-center flex-1 pt-16 md:pt-0">
          <p className="text-error">{error ?? 'Ticket not found'}</p>
        </main>
      </div>
    )
  }

  const assignee = ticket.assignee

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-16 bg-[#F4F4F2] flex justify-between items-center px-4 sm:px-8 z-40">
        <div className="flex items-center gap-3 pl-12 md:pl-0">
          <button
            onClick={() => navigate('/admin/tickets')}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              className="bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-1.5 text-xs w-48 lg:w-64 focus:ring-1 focus:ring-primary-container"
              placeholder="Search tickets..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-all">notifications</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-0 md:ml-[240px] pt-16 min-h-screen bg-surface-container-low flex-1">
        <div className="p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant/60">
              <li>
                <button onClick={() => navigate('/admin/tickets')} className="hover:text-primary-container">
                  Tickets
                </button>
              </li>
              <li><span className="material-symbols-outlined text-[14px]">chevron_right</span></li>
              <li className="text-primary">{ticket.id.slice(0, 8).toUpperCase()}</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-3 leading-tight">{ticket.title}</h2>
            <div className="flex flex-wrap items-center gap-3 lg:gap-6 text-sm font-medium text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-wider opacity-60">Firm:</span>
                {ticket.firms?.name ?? '—'}
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:block"></span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-wider opacity-60">Created:</span>
                {formatDate(ticket.created_at)}
              </span>
            </div>
          </header>

          {actionError && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">{actionError}</div>
          )}

          {/* Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-12">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-6 lg:space-y-12">
              {/* Ticket Metadata */}
              <section className="bg-surface-container-lowest rounded-xl p-5 lg:p-8">
                <div className="flex flex-wrap items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider ${getStatusStyle(ticket.status)}`}>
                    <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                    {ticket.status.toUpperCase()}
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider ${getPriorityStyle(ticket.priority)}`}>
                    {ticket.priority.toUpperCase()} PRIORITY
                  </div>
                  <div className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-full text-[10px] font-bold tracking-wider">
                    {ticket.type?.replace('_', ' ').toUpperCase()}
                  </div>
                  {ticket.ai_generated && (
                    <div className="px-3 py-1.5 bg-primary-container/10 text-primary-container rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                      AI GENERATED
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 pt-6 lg:pt-8 border-t border-outline-variant/10">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Estimated Time</p>
                    <p className="text-xl font-bold text-on-surface">{formatHours(ticket.estimated_hours)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Time Spent</p>
                    <p className="text-xl font-bold text-on-surface">{spentHours.toFixed(1)}h</p>
                    <div className="w-full bg-surface-container-low h-1 mt-2 rounded-full overflow-hidden">
                      <div className="bg-primary-container h-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Assignee</p>
                    {assignee ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
                          {assignee.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold text-on-surface">{assignee.name}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant italic">Unassigned</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Description */}
              <section>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-4 lg:mb-6">Description</h3>
                <div className="space-y-4 text-on-surface leading-relaxed max-w-3xl">
                  {ticket.description ? (
                    <p>{ticket.description}</p>
                  ) : (
                    <p className="text-on-surface-variant italic">No description provided.</p>
                  )}
                </div>
              </section>

              {/* Change Note */}
              {ticket.change_note && (
                <section>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-4">Change Note</h3>
                  <div className="border-l-4 border-primary-container/40 pl-4 text-sm text-on-surface-variant italic">
                    "{ticket.change_note}"
                  </div>
                </section>
              )}

              {/* Time Logs */}
              {timeLogs.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-4 lg:mb-6">Time Logs</h3>
                  <div className="space-y-3">
                    {timeLogs.map((log) => (
                      <div key={log.id} className="flex flex-wrap items-center gap-3 lg:gap-4 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                        <span className="font-bold text-sm text-primary-container">{formatHours(log.hours)}</span>
                        <span className="text-xs text-on-surface-variant capitalize">{log.log_type}</span>
                        {log.comment && <span className="text-sm text-on-surface flex-1">{log.comment}</span>}
                        <div className="ml-auto text-right flex flex-col gap-0.5">
                          <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap">{formatDate(log.created_at)}</span>
                          {log.updated_at && new Date(log.updated_at) - new Date(log.created_at) > 1000 && (
                            <span className="text-[10px] text-on-surface-variant/40 italic whitespace-nowrap">edited {timeAgo(log.updated_at)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-3 space-y-6 lg:space-y-8">
              {/* Quick Actions */}
              <section className="bg-surface-container-lowest rounded-xl p-5 lg:p-6 space-y-3">
                {ticket.status !== 'resolved' && ticket.status !== 'discarded' && (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 border border-outline-variant/30 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-all"
                    onClick={() => { setActionError(null); setShowEditModal(true) }}
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Ticket
                  </button>
                )}
                {ticket.status === 'draft' && (
                  <>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-3 border border-outline-variant/30 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-all"
                      onClick={() => { setActionError(null); setShowRegenerateModal(true) }}
                    >
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      Regenerate with AI
                    </button>
                    <button
                      className="w-full py-3 bg-primary-container text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all mt-2"
                      onClick={() => { setActionError(null); setShowAssignModal(true) }}
                    >
                      Assign &amp; Approve
                    </button>
                    <button
                      className="w-full py-3 border border-error/30 text-error rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-error/5 transition-all"
                      onClick={handleDiscard}
                      disabled={discarding}
                    >
                      {discarding ? 'Discarding...' : 'Discard Ticket'}
                    </button>
                  </>
                )}
                {ticket.status === 'approved' && (
                  <button
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
                    onClick={() => { setActionError(null); setIsResolveModalOpen(true) }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Mark as Resolved
                    </span>
                  </button>
                )}
              </section>

              {/* Details */}
              <section className="bg-surface-container-lowest rounded-xl p-5 lg:p-6 space-y-4">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Work Status</span>
                    {(() => {
                      const ws = getWorkStatus()
                      return (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-tighter ${ws.style}`}>
                          {ws.label}
                        </span>
                      )
                    })()}
                  </div>
                  {ticket.deadline && (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Deadline</span>
                      <span className={`font-medium text-sm ${new Date(ticket.deadline) < new Date() ? 'text-error font-bold' : ''}`}>
                        {new Date(ticket.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Updated</span>
                    <span className="font-medium">{formatDate(ticket.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">AI Generated</span>
                    <span className="font-medium">{ticket.ai_generated ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Edited</span>
                    <span className="font-medium">{ticket.edited ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </section>

              {/* Firm Card */}
              <section className="bg-[#111111] rounded-xl p-5 lg:p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Firm</h4>
                  <p className="text-xl font-extrabold text-white mb-2">{ticket.firms?.name ?? '—'}</p>
                  {ticket.change_note && (
                    <p className="text-[11px] text-gray-400 leading-relaxed">{ticket.change_note}</p>
                  )}
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#C84B0E] opacity-10 rounded-full blur-2xl"></div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <EditTicketModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        ticket={ticket}
        onSave={handleSaveEdit}
      />
      <RegenerateTicketModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        ticket={ticket}
        onRegenerate={handleRegenerate}
      />
      <AssignApproveModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        ticket={ticket}
        onApprove={handleAssignApprove}
      />
      <ResolveTicketModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        onConfirm={handleResolveConfirm}
        ticketData={{
          estimatedHours: ticket.estimated_hours,
          totalTimeSpent: `${spentHours.toFixed(1)}h`,
        }}
      />

      <Toast
        message="Ticket saved"
        isVisible={editSaved}
        onClose={() => setEditSaved(false)}
        autoDismissMs={2000}
      />
    </div>
  )
}

export default AdminTicketDetail
