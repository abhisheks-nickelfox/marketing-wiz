import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import AssignApproveModal from '../../components/modals/AssignApproveModal'
import EditTicketModal from '../../components/modals/EditTicketModal'
import RegenerateTicketModal from '../../components/modals/RegenerateTicketModal'
import ResolveTicketModal from '../../components/modals/ResolveTicketModal'
import Toast from '../../components/Toast'
import { ticketsApi, formatDate, formatHours, timeAgo, getStatusBadge, getStatusBadges, VALID_TRANSITIONS } from '../../lib/api'


const STATUS_LABELS = {
  draft:             'New',
  in_progress:       'In Progress',
  resolved:          'Resolved',
  internal_review:   'Internal Review',
  client_review:     'Client Review',
  compliance_review: 'Compliance Review',
  approved:          'Approved',
  closed:            'Closed',
  revisions:         'Revisions',
  discarded:         'Discarded',
}

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
  const [transitioning, setTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState(null)
  const [pendingTransitionStatus, setPendingTransitionStatus] = useState(null)
  const [revisionNotes, setRevisionNotes] = useState('')

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

  // 'revision' and 'transition' milestone logs carry hours=0 and must not inflate the total.
  const spentHours = timeLogs
    .filter((l) => l.log_type !== 'final' && l.log_type !== 'revision' && l.log_type !== 'transition')
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

  const handleTransitionSelect = (targetStatus) => {
    setTransitionError(null)
    if (targetStatus === 'revisions') {
      setRevisionNotes('')
      setPendingTransitionStatus('revisions')
    } else {
      handleTransition(targetStatus)
    }
  }

  const handleTransition = async (targetStatus, changeNote) => {
    setTransitioning(true)
    setTransitionError(null)
    try {
      await ticketsApi.transition(ticket.id, targetStatus, changeNote)
      setPendingTransitionStatus(null)
      setRevisionNotes('')
      loadData()
    } catch (err) {
      setTransitionError(err.message)
    } finally {
      setTransitioning(false)
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


  const getPriorityStyle = (p) => {
    const s = {
      urgent: 'bg-error-container text-on-error-container',
      high: 'bg-error/10 text-error',
      normal: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      low: 'bg-surface-container-high text-on-surface-variant',
    }
    return s[p] || s.normal
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
  const isClosed = ['closed', 'discarded'].includes(ticket.status)

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
                  {getStatusBadges(ticket, spentHours).map(({ label, style }) => (
                    <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider ${style}`}>
                      <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                      {label.toUpperCase()}
                    </div>
                  ))}
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

              {/* Time Logs — grouped by revision cycle */}
              {timeLogs.length > 0 && (() => {
                const KNOWN_LOG_TYPES = ['partial', 'estimate', 'final', 'transition']

                // Group by revision_cycle column value — never by sort position.
                // This is immune to same-second timestamp collisions that caused
                // revision sections to collapse into "Initial Work" after re-login.
                const cycleNotes = new Map()
                const cycleLogsMap = new Map()

                for (const log of timeLogs) {
                  const cycle = log.revision_cycle ?? 0
                  if (log.log_type === 'revision') {
                    cycleNotes.set(cycle, log.comment || null)
                    continue
                  }
                  if (!KNOWN_LOG_TYPES.includes(log.log_type)) continue
                  if (!cycleLogsMap.has(cycle)) cycleLogsMap.set(cycle, [])
                  cycleLogsMap.get(cycle).push(log)
                }

                for (const cycle of cycleNotes.keys()) {
                  if (!cycleLogsMap.has(cycle)) cycleLogsMap.set(cycle, [])
                }
                if (!cycleLogsMap.has(0)) cycleLogsMap.set(0, [])

                for (const logs of cycleLogsMap.values()) {
                  logs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                }

                const sections = [...cycleLogsMap.keys()]
                  .sort((a, b) => a - b)
                  .map((cycle) => ({
                    cycle,
                    note: cycleNotes.get(cycle) ?? null,
                    logs: cycleLogsMap.get(cycle),
                  }))

                const hasMultipleSections = sections.length > 1

                return (
                  <section>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-4 lg:mb-6">Time Logs</h3>
                    <div className="space-y-6">
                      {sections.map((section) => (
                        <div key={section.cycle}>
                          {/* Section header — only show "Initial Work" label when there are revisions */}
                          {section.cycle === 0 && hasMultipleSections && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-2">
                              Initial Work
                            </p>
                          )}
                          {/* Revision banner */}
                          {section.cycle > 0 && (
                            <div className="mb-3 rounded-lg bg-orange-50 border-l-4 border-orange-400 px-4 py-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-orange-500">edit_note</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                                  Revision {section.cycle} — Admin's Note
                                </p>
                              </div>
                              <p className="text-sm text-orange-700 font-medium leading-snug pl-5">
                                {section.note || <span className="italic opacity-60">No change note provided</span>}
                              </p>
                            </div>
                          )}
                          {/* Log entries for this cycle */}
                          {section.logs.length === 0 ? (
                            <p className="text-xs text-on-surface-variant/40 italic pl-1">No logs for this cycle</p>
                          ) : (
                            <div className="space-y-3">
                              {section.logs.map((log) => (
                                log.log_type === 'transition' ? (
                                  /* Status transition audit marker */
                                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/10">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant/40">arrow_circle_right</span>
                                    <span className="text-[10px] text-on-surface-variant/50 font-medium uppercase tracking-wider">Moved to</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(log.comment)}`}>
                                      {STATUS_LABELS[log.comment] ?? log.comment}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant/50 ml-auto whitespace-nowrap">{formatDate(log.created_at)}</span>
                                  </div>
                                ) : (
                                  /* Regular time log entry */
                                  <div
                                    key={log.id}
                                    className="flex flex-wrap items-center gap-3 lg:gap-4 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/10"
                                  >
                                    <span className="font-bold text-sm text-primary-container">{formatHours(log.hours)}</span>
                                    {log.log_type === 'final' && (
                                      <span className="text-[10px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded uppercase tracking-wider">Final</span>
                                    )}
                                    {log.comment && <span className="text-sm text-on-surface flex-1">{log.comment}</span>}
                                    <div className="ml-auto text-right flex flex-col gap-0.5">
                                      <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap">{formatDate(log.created_at)}</span>
                                      {log.updated_at && new Date(log.updated_at) - new Date(log.created_at) > 1000 && (
                                        <span className="text-[10px] text-on-surface-variant/40 italic whitespace-nowrap">edited {timeAgo(log.updated_at)}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })()}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-3 space-y-6 lg:space-y-8">
              {/* Quick Actions */}
              <section className="bg-surface-container-lowest rounded-xl p-5 lg:p-6 space-y-3">
                {!isClosed && (
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
                {['in_progress', 'revisions'].includes(ticket.status) && (
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
                {/* Status Transition — admin dropdown */}
                {!isClosed && ticket.status !== 'draft' && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Move Status</p>
                    <div className="flex gap-2 relative">
                      <select
                        id="status-transition"
                        value=""
                        disabled={transitioning}
                        onChange={(e) => { if (e.target.value) handleTransitionSelect(e.target.value) }}
                        className="flex-1 border-0 outline-none bg-surface-container-low rounded-lg px-3 py-2.5 text-xs font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="" disabled>Select status…</option>
                        {(VALID_TRANSITIONS[ticket.status] ?? []).map((s) => (
                            <option key={s} value={s}>
                              {s === 'draft' ? 'Move to Draft (Unassign)' : STATUS_LABELS[s]}
                            </option>
                          ))}
                      </select>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant self-center pointer-events-none -ml-8">expand_more</span>
                    </div>
                    {transitionError && <p className="text-xs text-error mt-1">{transitionError}</p>}
                  </div>
                )}

                {/* Revisions Notes Modal */}
                {pendingTransitionStatus === 'revisions' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                      <h3 className="text-base font-extrabold text-on-surface">Revision Notes</h3>
                      <p className="text-xs text-on-surface-variant">Describe what changes are needed. The assignee will see this note.</p>
                      <textarea
                        autoFocus
                        rows={4}
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="e.g. Please revise the copy to be more concise and update the tone..."
                        className="w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface resize-none outline-none focus:ring-2 focus:ring-primary/20 border-0"
                      />
                      {transitionError && <p className="text-xs text-error">{transitionError}</p>}
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => { setPendingTransitionStatus(null); setTransitionError(null) }}
                          className="flex-1 py-2.5 border border-outline-variant/30 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleTransition('revisions', revisionNotes.trim() || undefined)}
                          disabled={transitioning}
                          className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {transitioning ? 'Moving…' : 'Send for Revisions'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Details */}
              <section className="bg-surface-container-lowest rounded-xl p-5 lg:p-6 space-y-4">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50">Details</h3>
                <div className="space-y-3 text-sm">
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
