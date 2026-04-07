import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import ResolveTicketModal from '../../components/modals/ResolveTicketModal'
import Toast from '../../components/Toast'
import { ticketsApi, formatDate, formatHours, timeAgo, getStatusBadge, getStatusBadges, decimalToHoursMinutes, hoursMinutesToDecimal } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { invalidateMemberTicketsCache } from '../../lib/memberTicketsCache'

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

const MemberTicketDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()

  const [ticket, setTicket] = useState(null)
  const [timeLogs, setTimeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [estimatedHrs, setEstimatedHrs] = useState(0)
  const [estimatedMins, setEstimatedMins] = useState(0)
  const [savingHours, setSavingHours] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  const [newLogHrs, setNewLogHrs] = useState('')
  const [newLogMins, setNewLogMins] = useState('')
  const [newLogComment, setNewLogComment] = useState('')
  const [addingLog, setAddingLog] = useState(false)
  const [logError, setLogError] = useState(null)

  const [deletingLogId, setDeletingLogId] = useState(null)

  const [editingLogId, setEditingLogId] = useState(null)
  const [editLogHrs, setEditLogHrs] = useState('')
  const [editLogMins, setEditLogMins] = useState('')
  const [editLogComment, setEditLogComment] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [openCycles, setOpenCycles] = useState(new Set()) // expanded cycle numbers

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [resolving, setResolving] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([ticketsApi.get(id), ticketsApi.getTimeLogs(id)])
      .then(([ticketRes, logsRes]) => {
        const t = ticketRes.data
        setTicket(t)
        const { hrs, mins } = decimalToHoursMinutes(t.estimated_hours)
        setEstimatedHrs(hrs)
        setEstimatedMins(mins)
        const logs = logsRes.data ?? []
        setTimeLogs(logs)
        // Open only the latest cycle by default
        const maxCycle = logs.reduce((max, l) => Math.max(max, l.revision_cycle ?? 0), 0)
        setOpenCycles(new Set([maxCycle]))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Exclude 'final' (summary snapshot), 'revision' and 'transition' (zero-hour markers).
  const totalLogged = timeLogs
    .filter((l) => l.log_type !== 'final' && l.log_type !== 'revision' && l.log_type !== 'transition')
    .reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0)

  const handleSaveHours = async () => {
    setSavingHours(true)
    setError(null)
    try {
      const combined = hoursMinutesToDecimal(estimatedHrs, estimatedMins)
      await ticketsApi.update(id, { estimated_hours: combined })
      setTicket((prev) => ({ ...prev, estimated_hours: combined }))
      setHoursSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingHours(false)
    }
  }

  const handleAddLog = async () => {
    if ((!newLogHrs && !newLogMins) || !newLogComment) return
    setAddingLog(true)
    setLogError(null)
    try {
      const res = await ticketsApi.createTimeLog(id, {
        hours: hoursMinutesToDecimal(newLogHrs, newLogMins),
        comment: newLogComment,
        log_type: 'partial',
      })
      invalidateMemberTicketsCache()
      setTimeLogs((prev) => [res.data, ...prev])
      setNewLogHrs('')
      setNewLogMins('')
      setNewLogComment('')
    } catch (err) {
      setLogError(err.message)
    } finally {
      setAddingLog(false)
    }
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Delete this time log?')) return
    setDeletingLogId(logId)
    try {
      await ticketsApi.deleteTimeLog(id, logId)
      invalidateMemberTicketsCache()
      setTimeLogs((prev) => prev.filter((l) => l.id !== logId))
    } catch (err) {
      setLogError(err.message)
    } finally {
      setDeletingLogId(null)
    }
  }

  const handleEditLog = (log) => {
    const { hrs, mins } = decimalToHoursMinutes(log.hours)
    setEditLogHrs(hrs)
    setEditLogMins(mins)
    setEditLogComment(log.comment || '')
    setEditingLogId(log.id)
  }

  const handleSaveLogEdit = async () => {
    setSavingEdit(true)
    try {
      const combined = hoursMinutesToDecimal(editLogHrs, editLogMins)
      const res = await ticketsApi.updateTimeLog(id, editingLogId, {
        hours: combined,
        comment: editLogComment,
      })
      invalidateMemberTicketsCache()
      setTimeLogs((prev) => prev.map((l) => l.id === editingLogId ? res.data : l))
      setEditingLogId(null)
    } catch (err) {
      setLogError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleResolveConfirm = async ({ finalComment, hours }) => {
    setResolving(true)
    setError(null)
    try {
      await ticketsApi.resolve(id, {
        final_comment: finalComment,
        estimated_hours: hours ? parseFloat(hours) : undefined,
      })
      invalidateMemberTicketsCache()
      setIsResolveModalOpen(false)
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setResolving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="member" />
        <main className="ml-0 md:ml-[240px] min-h-screen flex items-center justify-center flex-1">
          <p className="text-on-surface-variant animate-pulse">Loading ticket...</p>
        </main>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex">
        <Sidebar role="member" />
        <main className="ml-0 md:ml-[240px] min-h-screen flex items-center justify-center flex-1">
          <p className="text-error">{error ?? 'Ticket not found'}</p>
        </main>
      </div>
    )
  }

  const isResolved = ticket.status === 'resolved'
  const isClosed = ['closed', 'discarded', 'internal_review', 'client_review',
                    'compliance_review', 'approved'].includes(ticket.status)
  const assignee = ticket.assignee
  const isAssignee = user?.id === assignee?.id

  return (
    <div className="flex">
      <Sidebar role="member" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] w-full md:w-[calc(100%-240px)] h-16 bg-[#F9F9F7] flex justify-between items-center px-8 z-40">
        {/* search — not yet implemented */}
        <div className="flex-1" />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
          <div className="h-8 w-[1px] bg-outline-variant/20"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">{user?.name ?? 'Member'}</p>
              <p className="text-[10px] text-primary font-bold tracking-wider uppercase">Member</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'MB'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-0 md:ml-[240px] pt-16 min-h-screen bg-surface flex-1">
        <div className="pt-8 pb-16 px-12 max-w-7xl">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Breadcrumb */}
          <Link
            to="/member/tickets"
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            My Tickets
          </Link>

          {/* Page Title */}
          <div className="mb-10 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              {getStatusBadges(ticket, totalLogged).map(({ label, style }) => (
                <span key={label} className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${style}`}>
                  {label}
                </span>
              ))}
              {isResolved && (
                <span className="text-xs font-medium text-teal-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Resolved
                </span>
              )}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
              {ticket.title}
            </h2>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-10 gap-12 items-start">
            {/* LEFT COLUMN (60%) */}
            <div className="col-span-6 space-y-8">
              {/* Ticket Details Card */}
              <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
                <div className="flex flex-wrap gap-8 mb-8 pb-6">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Firm</p>
                    <p className="text-sm font-semibold">{ticket.firms?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Type</p>
                    <p className="text-sm font-semibold capitalize">{ticket.type?.replace('_', ' ') ?? '—'}</p>
                  </div>
                  <div className="ml-auto flex gap-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                      ticket.priority === 'urgent' ? 'bg-error-container text-on-error-container'
                      : ticket.priority === 'high' ? 'bg-error/10 text-error'
                      : ticket.priority === 'normal' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                      : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <p className="text-sm text-on-surface/80 leading-relaxed">
                    {ticket.description ?? 'No description provided.'}
                  </p>
                </div>

                {/* Admin Change Note — shown prominently when ticket is in revisions */}
                {ticket.status === 'revisions' && ticket.change_note && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-orange-500">edit_note</span>
                      <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">Changes Requested</p>
                    </div>
                    <p className="text-sm font-medium text-orange-700 italic leading-snug pl-5">
                      {ticket.change_note}
                    </p>
                  </div>
                )}
              </section>

              {/* Estimated Time Card — assignee only */}
              {!(isClosed || isResolved) && isAssignee && (
                <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-5">Estimated Time</p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center gap-2">
                        <input
                          className="w-14 border-0 outline-none bg-transparent text-2xl font-extrabold text-on-surface text-center focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min="0"
                          max="999"
                          type="number"
                          value={estimatedHrs}
                          onChange={(e) => setEstimatedHrs(e.target.value)}
                          disabled={isClosed}
                        />
                        <span className="text-sm font-bold text-on-surface-variant">h</span>
                      </div>
                      <span className="text-on-surface-variant/40 font-bold">:</span>
                      <div className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center gap-2">
                        <input
                          className="w-14 border-0 outline-none bg-transparent text-2xl font-extrabold text-on-surface text-center focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min="0"
                          max="59"
                          type="number"
                          value={estimatedMins}
                          onChange={(e) => setEstimatedMins(e.target.value)}
                          disabled={isClosed}
                        />
                        <span className="text-sm font-bold text-on-surface-variant">m</span>
                      </div>
                    </div>
                    <button
                      className="px-6 py-3 bg-primary-container text-white font-bold text-xs rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                      onClick={handleSaveHours}
                      disabled={savingHours || isClosed}
                    >
                      {savingHours ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </section>
              )}

              {/* Time History Card */}
              <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time History</p>
                    <p className="text-2xl font-extrabold text-on-surface mt-1">{formatHours(totalLogged)}</p>
                    <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest">Total Logged</p>
                  </div>
                  {timeLogs.filter((l) => l.log_type !== 'final' && l.log_type !== 'revision').length > 0 && (
                    <span className="text-[10px] font-bold bg-surface-container-high text-on-surface-variant uppercase tracking-wider px-3 py-1 rounded-full">
                      {timeLogs.filter((l) => l.log_type !== 'final' && l.log_type !== 'revision').length}{' '}
                      {timeLogs.filter((l) => l.log_type !== 'final' && l.log_type !== 'revision').length === 1 ? 'entry' : 'entries'}
                    </span>
                  )}
                </div>

                {/* Log entries — grouped by revision cycle */}
                <div className="px-6 pb-4">
                  {logError && (
                    <p className="text-xs text-error mb-3">{logError}</p>
                  )}
                  {timeLogs.length === 0 && (
                    <div className="text-center py-10">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">schedule</span>
                      <p className="text-sm text-on-surface-variant/50 mt-2">No time logged yet</p>
                    </div>
                  )}

                  {timeLogs.length > 0 && (() => {
                    const KNOWN_LOG_TYPES = ['partial', 'estimate', 'final', 'transition']

                    // Group by revision_cycle column value — never by sort position.
                    // This is immune to same-second timestamp collisions that caused
                    // revision sections to collapse into "Initial Work" after re-login.
                    const cycleNotes = new Map()   // cycle → admin's note text
                    const cycleLogsMap = new Map() // cycle → log[]

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

                    // Include cycles that have a revision marker but no logs yet
                    for (const cycle of cycleNotes.keys()) {
                      if (!cycleLogsMap.has(cycle)) cycleLogsMap.set(cycle, [])
                    }
                    // Cycle 0 always exists
                    if (!cycleLogsMap.has(0)) cycleLogsMap.set(0, [])

                    // Sort logs within each cycle by created_at ascending
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

                    return (
                      <div className="space-y-4">
                        {sections.map((section) => {
                          const cycleTotal = section.logs.reduce(
                            (sum, l) => sum + (parseFloat(l.hours) || 0),
                            0
                          )
                          const entryCount = section.logs.filter(
                            (l) => l.log_type !== 'final' && l.log_type !== 'transition'
                          ).length

                          const isOpen = openCycles.has(section.cycle)
                          const toggleCycle = () => setOpenCycles((prev) => {
                            const next = new Set(prev)
                            if (next.has(section.cycle)) next.delete(section.cycle)
                            else next.add(section.cycle)
                            return next
                          })

                          return (
                            <div key={section.cycle} className="rounded-xl overflow-hidden shadow-sm">
                              {/* Revision: admin note banner at top of card */}
                              {section.cycle > 0 && (
                                <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 space-y-1">
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

                              {/* Cycle header — click to collapse/expand */}
                              <button
                                onClick={toggleCycle}
                                className="w-full bg-surface-container-low px-4 py-3 flex items-center justify-between hover:bg-surface-container transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="material-symbols-outlined text-sm text-on-surface-variant/50 transition-transform duration-200"
                                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                    chevron_right
                                  </span>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                                    {section.cycle === 0 ? 'Initial Work' : `Revision ${section.cycle} Logs`}
                                  </p>
                                  <span className="text-[10px] text-on-surface-variant/40">
                                    {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-on-surface-variant/70 tabular-nums">
                                  {cycleTotal > 0 ? formatHours(cycleTotal) : '—'}
                                </span>
                              </button>

                              {/* Accordion body — grid-rows transition for smooth open/close */}
                              <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden min-h-0">
                              {section.logs.length === 0 ? (
                                <div className="bg-surface-container-lowest px-5 py-4">
                                  <p className="text-xs text-on-surface-variant/40 italic">
                                    No logs added yet for this revision
                                  </p>
                                </div>
                              ) : (
                                <div className="divide-y divide-surface-container-low">
                                  {section.logs.map((log) => (
                                    <div
                                      key={log.id}
                                      className="group relative bg-surface-container-lowest px-5 py-4 hover:bg-surface-container transition-colors"
                                    >
                                      {log.log_type === 'transition' ? (
                                        /* Status transition audit marker */
                                        <div className="flex items-center gap-3">
                                          <span className="material-symbols-outlined text-sm text-on-surface-variant/40">arrow_circle_right</span>
                                          <span className="text-[10px] text-on-surface-variant/50 font-medium uppercase tracking-wider">Moved to</span>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(log.comment)}`}>
                                            {STATUS_LABELS[log.comment] ?? log.comment}
                                          </span>
                                          <span className="text-[10px] text-on-surface-variant/50 ml-auto">{formatDate(log.created_at)}</span>
                                        </div>
                                      ) : editingLogId === log.id ? (
                                        /* Edit mode */
                                        <div className="flex items-center gap-2 w-full">
                                          <input
                                            type="number" min="0" max="999" value={editLogHrs}
                                            onChange={(e) => setEditLogHrs(e.target.value)}
                                            className="w-12 border-0 outline-none bg-white rounded-lg px-2 py-1.5 text-xs text-center font-bold focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          />
                                          <span className="text-xs text-on-surface-variant">h</span>
                                          <input
                                            type="number" min="0" max="59" value={editLogMins}
                                            onChange={(e) => setEditLogMins(e.target.value)}
                                            className="w-12 border-0 outline-none bg-white rounded-lg px-2 py-1.5 text-xs text-center font-bold focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          />
                                          <span className="text-xs text-on-surface-variant">m</span>
                                          <input
                                            type="text" value={editLogComment}
                                            onChange={(e) => setEditLogComment(e.target.value)}
                                            className="flex-1 border-0 outline-none bg-white rounded-lg px-3 py-1.5 text-xs focus:ring-0"
                                          />
                                          <button
                                            onClick={handleSaveLogEdit}
                                            disabled={savingEdit}
                                            className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors"
                                          >
                                            <span className="material-symbols-outlined text-sm text-green-600">check</span>
                                          </button>
                                          <button
                                            onClick={() => setEditingLogId(null)}
                                            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                          >
                                            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
                                          </button>
                                        </div>
                                      ) : (
                                        /* Normal view */
                                        <div className="flex items-start gap-4">
                                          {/* Time pill */}
                                          <div className="flex-shrink-0 bg-orange-50 rounded-lg px-3 py-2 text-center min-w-[56px]">
                                            <p className="text-sm font-extrabold text-primary-container leading-tight">{formatHours(log.hours)}</p>
                                            {log.log_type === 'final' && (
                                              <p className="text-[9px] font-bold uppercase tracking-wider text-primary-container/60 mt-0.5">final</p>
                                            )}
                                          </div>

                                          {/* Content */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-on-surface font-medium leading-snug">
                                              {log.comment || <span className="text-on-surface-variant/40 italic">No comment</span>}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                              <span className="text-[10px] text-on-surface-variant/60">{formatDate(log.created_at)}</span>
                                              {log.updated_at && new Date(log.updated_at) - new Date(log.created_at) > 1000 && (
                                                <span className="text-[10px] text-on-surface-variant/40 italic">· edited {timeAgo(log.updated_at)}</span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Actions — hover reveal; excluded for final, revision, transition logs */}
                                          {!(isClosed || isResolved) && log.log_type !== 'final' && log.log_type !== 'revision' && log.log_type !== 'transition' && (
                                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => handleEditLog(log)}
                                                className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                                title="Edit"
                                              >
                                                <span className="material-symbols-outlined text-sm text-on-surface-variant">edit</span>
                                              </button>
                                              <button
                                                onClick={() => handleDeleteLog(log.id)}
                                                disabled={deletingLogId === log.id}
                                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                                title="Delete"
                                              >
                                                <span className="material-symbols-outlined text-sm text-error">delete</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                                </div>{/* overflow-hidden */}
                              </div>{/* accordion grid wrapper */}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Add Log Form — assignee only */}
                {!(isClosed || isResolved) && isAssignee && (
                  <div className="px-6 pb-6">
                    <div className="bg-surface-container-low rounded-xl px-5 py-4 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          className="w-14 border-0 outline-none bg-white rounded-lg px-2 py-2 text-xs text-center font-bold focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                          type="number"
                          min="0"
                          max="999"
                          value={newLogHrs}
                          onChange={(e) => setNewLogHrs(e.target.value)}
                        />
                        <span className="text-xs text-on-surface-variant font-medium">h</span>
                        <input
                          className="w-14 border-0 outline-none bg-white rounded-lg px-2 py-2 text-xs text-center font-bold focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                          type="number"
                          min="0"
                          max="59"
                          value={newLogMins}
                          onChange={(e) => setNewLogMins(e.target.value)}
                        />
                        <span className="text-xs text-on-surface-variant font-medium">m</span>
                      </div>
                      <input
                        className="flex-1 border-0 outline-none bg-white rounded-lg px-3 py-2 text-xs focus:ring-0"
                        placeholder="What did you work on?"
                        type="text"
                        value={newLogComment}
                        onChange={(e) => setNewLogComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                      />
                      <button
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary-container text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                        onClick={handleAddLog}
                        disabled={addingLog || (!newLogHrs && !newLogMins) || !newLogComment}
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN (40%) */}
            <div className="col-span-4 space-y-8">
              {/* Resolution Status Card */}
              <section className={`bg-surface-container-lowest rounded-xl p-8 border-t-4 shadow-sm ${isClosed ? 'border-teal-500' : 'border-primary-container'}`}>
                <div className="flex items-start gap-4 mb-8">
                  <div className="bg-primary/5 p-2 rounded-lg">
                    <span className={`material-symbols-outlined text-2xl ${isClosed ? 'text-teal-500' : 'text-primary-container'}`}>
                      {isClosed ? 'check_circle' : 'sync'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-on-surface">
                      {isResolved ? 'Ticket Resolved' : isClosed ? 'Ticket Closed' : 'Active Workflow'}
                    </p>
                    <p className="text-[11px] font-medium text-on-surface-variant">
                      {isClosed ? `${STATUS_LABELS[ticket.status] ?? ticket.status} on ${formatDate(ticket.updated_at)}` : `Status: ${STATUS_LABELS[ticket.status] ?? ticket.status}`}
                    </p>
                  </div>
                </div>

                {['in_progress', 'revisions'].includes(ticket.status) && isAssignee && (
                  <>
                    {ticket.status === 'revisions' && (
                      <div className="mb-4 flex gap-2 text-orange-600 bg-orange-50 rounded-lg p-3">
                        <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">edit_note</span>
                        <p className="text-[11px] font-medium leading-snug">This ticket was sent back for revisions. Review the change note above, make updates, and mark as resolved when done.</p>
                      </div>
                    )}
                    <button
                      className="w-full bg-primary-container text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
                      onClick={() => setIsResolveModalOpen(true)}
                      disabled={resolving}
                    >
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                      Mark as Resolved
                    </button>
                    <div className="mt-4 flex gap-2 text-on-surface-variant/60">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <p className="text-[10px] italic">Resolving this ticket will lock further time logging.</p>
                    </div>
                  </>
                )}
                {!isClosed && !isAssignee && (
                  <p className="text-sm text-on-surface-variant">
                    Assigned to <span className="font-semibold text-on-surface">{assignee?.name ?? '—'}</span>
                  </p>
                )}
              </section>

              {/* Ticket Meta */}
              <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Estimated</span>
                    <span className="font-medium">{formatHours(ticket.estimated_hours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Logged</span>
                    <span className="font-medium">{formatHours(totalLogged)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">AI Generated</span>
                    <span className="font-medium">{ticket.ai_generated ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Assignee</span>
                    <span className="font-medium">{assignee?.name ?? user?.name ?? '—'}</span>
                  </div>
                </div>
              </section>

              {/* Firm Card */}
              <section className="bg-[#111111] rounded-xl p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Firm</h4>
                  <p className="text-xl font-extrabold text-white mb-2">{ticket.firms?.name ?? '—'}</p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#C84B0E] opacity-10 rounded-full blur-2xl"></div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Resolve Ticket Modal */}
      <ResolveTicketModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        onConfirm={handleResolveConfirm}
        ticketData={{
          estimatedHours: ticket.estimated_hours,
          totalTimeSpent: `${totalLogged.toFixed(1)}h`,
        }}
      />

      <Toast
        message="Estimated time saved"
        isVisible={hoursSaved}
        onClose={() => setHoursSaved(false)}
        autoDismissMs={2000}
      />
    </div>
  )
}

export default MemberTicketDetail
