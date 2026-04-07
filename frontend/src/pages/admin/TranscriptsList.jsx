import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { transcriptsApi, firmsApi, promptsApi, formatDate, formatDuration } from '../../lib/api'

const TranscriptsList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [showArchived, setShowArchived] = useState(false)
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)

  // Right panel state
  const [selected, setSelected] = useState(null)
  const [firms, setFirms] = useState([])
  const [prompts, setPrompts] = useState([])
  const [formLoading, setFormLoading] = useState(false)
  const [selectedFirmId, setSelectedFirmId] = useState('')
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState(null)

  // Add Transcript modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10))
  const [addDuration, setAddDuration] = useState('')
  const [addParticipants, setAddParticipants] = useState('')
  const [addBody, setAddBody] = useState('')
  const [addFirmId, setAddFirmId] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // mobile: 'list' | 'form'
  const [mobileView, setMobileView] = useState('list')

  const fetchTranscripts = (archived) => {
    setLoading(true)
    transcriptsApi
      .list(archived)
      .then((res) => {
        const list = res.data ?? []
        setTranscripts(list)
        // Pre-select transcript if ?id= is present in the URL
        const preselectedId = searchParams.get('id')
        if (preselectedId) {
          const match = list.find((t) => String(t.id) === String(preselectedId))
          if (match) handleSelect(match)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTranscripts(showArchived)
  }, [showArchived])

  const handleSelect = (transcript) => {
    setSelected(transcript)
    setProcessError(null)
    setNotes('')
    setMobileView('form')

    if (firms.length === 0 || prompts.length === 0) {
      setFormLoading(true)
      Promise.all([firmsApi.list(), promptsApi.list()])
        .then(([firmsRes, promptsRes]) => {
          const fl = firmsRes.data ?? []
          const pl = promptsRes.data ?? []
          setFirms(fl)
          setPrompts(pl)
          if (fl.length > 0) setSelectedFirmId(fl[0].id)
          if (pl.length > 0) setSelectedPromptId(pl[0].id)
        })
        .catch((err) => setProcessError(err.message))
        .finally(() => setFormLoading(false))
    }
  }

  const handleToggleArchive = async (id, e) => {
    e.stopPropagation()
    try {
      await transcriptsApi.toggleArchive(id)
      fetchTranscripts(showArchived)
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleProcess = async () => {
    if (!selectedFirmId || !selectedPromptId) return
    setProcessing(true)
    setProcessError(null)
    try {
      await transcriptsApi.process(selected.id, {
        firm_id: selectedFirmId,
        prompt_id: selectedPromptId,
        text_notes: notes,
      })
      navigate(`/admin/firms/${selectedFirmId}/unassigned`)
    } catch (err) {
      setProcessError(err.message)
      setProcessing(false)
    }
  }

  const handleAddTranscript = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      const participantList = addParticipants
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      const payload = {
        title: addTitle.trim(),
        call_date: addDate,
        duration_sec: addDuration ? parseInt(addDuration, 10) * 60 : 0,
        participants: participantList,
        raw_transcript: addBody.trim(),
        ...(addFirmId ? { firm_id: addFirmId } : {}),
      }
      await transcriptsApi.create(payload)
      // Reset form and close modal
      setAddTitle('')
      setAddDate(new Date().toISOString().slice(0, 10))
      setAddDuration('')
      setAddParticipants('')
      setAddBody('')
      setAddFirmId('')
      setShowAddModal(false)
      fetchTranscripts(showArchived)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const openAddModal = () => {
    setAddError(null)
    // Ensure firms are loaded so the select is populated
    if (firms.length === 0) {
      firmsApi.list()
        .then((res) => setFirms(res.data ?? []))
        .catch(() => {/* non-fatal — firm field will be empty */})
    }
    setShowAddModal(true)
  }

  const participants = Array.isArray(selected?.participants) ? selected.participants : []
  const selectedFirmName = firms.find((f) => f.id === selectedFirmId)?.name ?? 'the selected firm'

  return (
    <div className="flex">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col ml-0 md:ml-[240px] h-screen overflow-hidden">
      {/* TopNav */}
      <header className="sticky top-0 h-14 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-40 border-b border-surface-container-low shrink-0">
        <div className="flex items-center gap-3 flex-1 pl-12 md:pl-0 min-w-0">
          {mobileView === 'form' && selected && (
            <button
              className="lg:hidden p-1 -ml-1 text-on-surface-variant"
              onClick={() => setMobileView('list')}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <span className="font-bold text-on-surface truncate">
            {mobileView === 'form' && selected ? selected.title : 'Transcripts'}
          </span>
        </div>
        <button className="text-slate-500 hover:text-[#C84B0E] transition-colors p-1">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      {/* Body — fills viewport below header */}
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">

          {/* ── LEFT PANEL: Transcript list ── */}
          <div className={`
            ${mobileView === 'form' ? 'hidden' : 'flex'} lg:flex
            flex-col w-full lg:w-[400px] xl:w-[440px] shrink-0
            bg-white border-r border-surface-container-low overflow-hidden
          `}>
            {/* List header */}
            <div className="px-4 sm:px-5 py-4 border-b border-surface-container-low space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-on-surface tracking-tight">All Transcripts</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{transcripts.length} total</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 bg-surface-container text-on-surface text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add
                  </button>
                  <button
                    disabled={syncing}
                    onClick={async () => {
                      setSyncing(true)
                      try { await transcriptsApi.sync(); fetchTranscripts(showArchived) }
                      catch (err) { setError(err.message) }
                      finally { setSyncing(false) }
                    }}
                    className="flex items-center gap-1.5 bg-primary-container text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary transition-all disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>sync</span>
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Archived toggle */}
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-primary-container' : 'bg-surface-container-high'}`}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${showArchived ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
                <span className="text-xs font-medium text-on-surface-variant">Show Archived</span>
              </label>
            </div>

            {/* Transcript cards */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-container-low">
              {loading && (
                <div className="py-12 text-center text-sm text-on-surface-variant animate-pulse">
                  Loading transcripts…
                </div>
              )}
              {error && (
                <div className="px-4 py-3 bg-error-container text-on-error-container text-sm">{error}</div>
              )}
              {!loading && transcripts.length === 0 && (
                <div className="py-14 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">description_off</span>
                  <p className="text-sm">No transcripts found</p>
                </div>
              )}

              {transcripts.map((t) => {
                const pArr = Array.isArray(t.participants) ? t.participants : []
                const isActive = selected?.id === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`
                      group px-4 sm:px-5 py-4 cursor-pointer transition-all
                      border-l-[3px]
                      ${isActive
                        ? 'bg-primary-container/5 border-l-primary-container'
                        : 'hover:bg-surface-container-low/50 border-l-transparent'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-primary-container text-white' : 'bg-surface-container-high text-primary-container'
                      }`}>
                        <span className="material-symbols-outlined text-[17px]">description</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary-container' : 'text-on-surface'}`}>
                          {t.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                          <span className="text-[11px] text-on-surface-variant">{formatDate(t.call_date)}</span>
                          <span className="text-[11px] text-on-surface-variant">{formatDuration(t.duration_sec)}</span>
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">group</span>
                            {pArr.length}
                          </span>
                        </div>
                        {t.archived && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                          isActive
                            ? 'bg-primary-container text-white'
                            : 'bg-surface-container text-on-surface-variant group-hover:bg-primary-container/10 group-hover:text-primary-container'
                        }`}>
                          Process
                        </span>
                        <button
                          onClick={(e) => handleToggleArchive(t.id, e)}
                          className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors uppercase tracking-wide"
                        >
                          {t.archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL: Process form ── */}
          <div className={`
            ${mobileView === 'list' ? 'hidden' : 'flex'} lg:flex
            flex-col flex-1 bg-[#F5F5F3] overflow-y-auto
          `}>

            {!selected ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">auto_awesome</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-1.5">Select a transcript</h3>
                <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed mb-8">
                  Pick any transcript from the list to generate AI-powered marketing tickets.
                </p>

                <div className="w-full max-w-xs space-y-2.5">
                  {[
                    { icon: 'description', text: 'Pick a call transcript' },
                    { icon: 'business', text: 'Assign to a client firm' },
                    { icon: 'auto_awesome', text: 'AI generates ticket drafts' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                      <div className="w-7 h-7 rounded-lg bg-primary-container/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary-container text-[15px]">{step.icon}</span>
                      </div>
                      <span className="text-sm text-on-surface-variant font-medium flex-1 text-left">{step.text}</span>
                      <span className="text-xs font-bold text-on-surface-variant/30">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">

                {/* Transcript summary bar */}
                <div className="bg-white border-b border-surface-container-low px-5 sm:px-8 py-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-container">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-on-surface leading-tight">{selected.title}</h4>
                        <span className="shrink-0 text-[10px] font-bold text-primary-container bg-primary-container/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Ready
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          {formatDate(selected.call_date)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                          {formatDuration(selected.duration_sec)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[13px]">group</span>
                          {participants.length} participants
                        </span>
                      </div>

                      {/* Participant chips */}
                      {participants.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {participants.map((p, i) => {
                            const name = typeof p === 'string' ? p : (p.name ?? '?')
                            return (
                              <span key={i} className="flex items-center gap-1.5 bg-surface-container-low text-on-surface-variant text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                                <span className="w-4 h-4 rounded-full bg-primary-container/20 text-primary-container text-[9px] font-bold flex items-center justify-center uppercase">
                                  {name.charAt(0)}
                                </span>
                                {name}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="flex-1 px-5 sm:px-8 py-7">
                  <div className="max-w-lg">
                    <h3 className="text-xl font-extrabold text-on-surface tracking-tight mb-1">Process with AI</h3>
                    <p className="text-sm text-on-surface-variant mb-6">
                      Generate ticket drafts for a client firm from this transcript.
                    </p>

                    {processError && (
                      <div className="mb-5 p-4 bg-error-container text-on-error-container rounded-xl text-sm">
                        {processError}
                      </div>
                    )}

                    {formLoading ? (
                      <div className="py-10 text-center text-sm text-on-surface-variant animate-pulse">
                        Loading firms and prompts…
                      </div>
                    ) : (
                      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleProcess() }}>

                        {/* Firm */}
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2">
                            Client Firm <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">business</span>
                            <select
                              value={selectedFirmId}
                              onChange={(e) => setSelectedFirmId(e.target.value)}
                              required
                              className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 pl-10 pr-10 text-sm appearance-none focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                            >
                              {firms.length === 0 && <option value="">No firms available</option>}
                              {firms.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
                          </div>
                        </div>

                        {/* Prompt */}
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2">
                            AI Prompt <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">psychology</span>
                            <select
                              value={selectedPromptId}
                              onChange={(e) => setSelectedPromptId(e.target.value)}
                              required
                              className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 pl-10 pr-10 text-sm appearance-none focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                            >
                              {prompts.length === 0 && <option value="">No prompts available — create one first</option>}
                              {prompts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.type ? ` (${p.type})` : ''}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2">
                            Notes
                            <span className="ml-2 normal-case font-normal tracking-normal text-on-surface-variant/50 text-xs">optional</span>
                          </label>
                          <textarea
                            rows="3"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add specific instructions for the AI…"
                            className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none resize-none"
                          />
                        </div>

                        {/* Submit */}
                        <div className="pt-1 space-y-3">
                          <button
                            type="submit"
                            disabled={processing || !selectedFirmId || !selectedPromptId}
                            className="w-full bg-primary-container hover:bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? (
                              <>
                                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                Generating Tickets…
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                Process with AI
                              </>
                            )}
                          </button>

                          <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-outline-variant/15">
                            <span className="material-symbols-outlined text-primary-container/50 text-lg mt-0.5 shrink-0">info</span>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">
                              AI will analyze this transcript and generate <strong className="text-on-surface">draft tickets</strong> for{' '}
                              <strong className="text-on-surface">{selectedFirmName}</strong>. You can review and approve each ticket before it goes live.
                            </p>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
      </div>

      {/* ── Add Transcript Modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-transcript-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-surface-container-low px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container text-[17px]">note_add</span>
                </div>
                <h2 id="add-transcript-title" className="font-extrabold text-on-surface tracking-tight">
                  Add Transcript
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-6">
              {addError && (
                <div className="mb-5 p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddTranscript} className="space-y-5">

                {/* Title */}
                <div>
                  <label
                    htmlFor="add-title"
                    className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                  >
                    Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="add-title"
                    type="text"
                    required
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. Q2 Strategy Call with Acme"
                    className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                  />
                </div>

                {/* Call Date + Duration — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="add-date"
                      className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                    >
                      Call Date <span className="text-error">*</span>
                    </label>
                    <input
                      id="add-date"
                      type="date"
                      required
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="add-duration"
                      className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                    >
                      Duration
                      <span className="ml-1.5 normal-case font-normal tracking-normal text-on-surface-variant/50 text-xs">min</span>
                    </label>
                    <input
                      id="add-duration"
                      type="number"
                      min="0"
                      value={addDuration}
                      onChange={(e) => setAddDuration(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <label
                    htmlFor="add-participants"
                    className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                  >
                    Participants
                    <span className="ml-2 normal-case font-normal tracking-normal text-on-surface-variant/50 text-xs">optional</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">group</span>
                    <input
                      id="add-participants"
                      type="text"
                      value={addParticipants}
                      onChange={(e) => setAddParticipants(e.target.value)}
                      placeholder="Alice, Bob, Charlie (comma-separated)"
                      className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {/* Transcript body */}
                <div>
                  <label
                    htmlFor="add-body"
                    className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                  >
                    Transcript Body <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="add-body"
                    rows="6"
                    required
                    value={addBody}
                    onChange={(e) => setAddBody(e.target.value)}
                    placeholder="Paste the full transcript text here…"
                    className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container/20 outline-none resize-none text-on-surface"
                  />
                </div>

                {/* Client Firm */}
                <div>
                  <label
                    htmlFor="add-firm"
                    className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2"
                  >
                    Client Firm
                    <span className="ml-2 normal-case font-normal tracking-normal text-on-surface-variant/50 text-xs">optional</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">business</span>
                    <select
                      id="add-firm"
                      value={addFirmId}
                      onChange={(e) => setAddFirmId(e.target.value)}
                      className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 pl-10 pr-10 text-sm appearance-none focus:ring-2 focus:ring-primary-container/20 outline-none text-on-surface"
                    >
                      <option value="">No firm assigned</option>
                      {firms.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">expand_more</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-surface-container text-on-surface font-bold py-3 rounded-xl text-sm hover:bg-surface-container-high transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 bg-primary-container hover:bg-primary text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addLoading ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">save</span>
                        Save Transcript
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscriptsList
