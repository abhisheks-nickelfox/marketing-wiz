import { useState } from 'react'
import { ticketsApi } from '../../lib/api'

const TICKET_TYPES = [
  { value: 'task', label: 'Task' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'account_management', label: 'Account Management' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const INITIAL_STATE = {
  title: '',
  type: '',
  priority: 'normal',
  description: '',
}

const CreateTicketModal = ({ isOpen, onClose, firmId, onSuccess }) => {
  const [title, setTitle] = useState(INITIAL_STATE.title)
  const [type, setType] = useState(INITIAL_STATE.type)
  const [priority, setPriority] = useState(INITIAL_STATE.priority)
  const [description, setDescription] = useState(INITIAL_STATE.description)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSubmitDisabled = !title.trim() || !type || loading

  const resetForm = () => {
    setTitle(INITIAL_STATE.title)
    setType(INITIAL_STATE.type)
    setPriority(INITIAL_STATE.priority)
    setDescription(INITIAL_STATE.description)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitDisabled) return

    setLoading(true)
    setError(null)

    try {
      await ticketsApi.create({
        firm_id: firmId,
        title: title.trim(),
        type,
        priority,
        description: description.trim() || undefined,
        ai_generated: false,
      })
      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-dim/40 backdrop-blur-md"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ticket-modal-title"
      >
        {/* Sticky header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-outline-variant/15">
          <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-lg shrink-0">
            <span className="material-symbols-outlined text-white text-base">add_task</span>
          </div>
          <h2
            id="create-ticket-modal-title"
            className="flex-1 text-base font-extrabold tracking-tight text-on-surface"
          >
            Create Ticket
          </h2>
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-5">
            {/* Error banner */}
            {error && (
              <div
                className="p-3 bg-error-container text-on-error-container rounded-lg text-xs font-medium"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label
                htmlFor="ct-title"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Title <span className="text-error">*</span>
              </label>
              <input
                id="ct-title"
                type="text"
                required
                className="w-full bg-white border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container/20 placeholder:text-slate-300"
                placeholder="e.g., Update homepage hero assets"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="ct-type"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Type <span className="text-error">*</span>
              </label>
              <div className="relative">
                <select
                  id="ct-type"
                  required
                  className="w-full appearance-none bg-white border border-outline-variant/25 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="" disabled>Select type…</option>
                  {TICKET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="ct-priority"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Priority
              </label>
              <div className="relative">
                <select
                  id="ct-priority"
                  className="w-full appearance-none bg-white border border-outline-variant/25 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="ct-description"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Description{' '}
                <span className="normal-case tracking-normal font-normal text-slate-300">(optional)</span>
              </label>
              <textarea
                id="ct-description"
                rows={3}
                className="w-full bg-white border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container/20 resize-none leading-relaxed placeholder:text-slate-300"
                placeholder="Add any context or requirements…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-1">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-bold text-primary rounded-xl outline outline-1 outline-outline-variant/20 hover:bg-surface-container-low transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-6 py-2.5 text-sm font-bold bg-primary-container text-white rounded-xl hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
              )}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTicketModal
