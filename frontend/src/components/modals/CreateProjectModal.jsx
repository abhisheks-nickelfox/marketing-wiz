import { useState } from 'react'
import { projectsApi } from '../../lib/api'

const CreateProjectModal = ({ isOpen, onClose, firmId, firmName, firms = [], onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFirmId, setSelectedFirmId] = useState(firmId ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const firmLocked = Boolean(firmId)
  const isSubmitDisabled = !name.trim() || !selectedFirmId || loading

  const resetForm = () => {
    setName('')
    setDescription('')
    setSelectedFirmId(firmId ?? '')
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
      const res = await projectsApi.create({
        firm_id: selectedFirmId,
        name: name.trim(),
        description: description.trim() || undefined,
      })
      resetForm()
      onCreated(res.data)
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
        aria-labelledby="create-project-modal-title"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-outline-variant/15">
          <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-lg shrink-0">
            <span className="material-symbols-outlined text-white text-base">folder_open</span>
          </div>
          <h2
            id="create-project-modal-title"
            className="flex-1 text-base font-extrabold tracking-tight text-on-surface"
          >
            New Project
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

            {/* Firm */}
            <div>
              <label
                htmlFor="cp-firm"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Firm <span className="text-error">*</span>
              </label>
              {firmLocked ? (
                <div className="w-full bg-surface-container-low border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface font-medium">
                  {firmName ?? firms.find((f) => f.id === firmId)?.name ?? firmId}
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="cp-firm"
                    required
                    className="w-full appearance-none bg-white border border-outline-variant/25 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                    value={selectedFirmId}
                    onChange={(e) => setSelectedFirmId(e.target.value)}
                  >
                    <option value="" disabled>Select a firm…</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <span
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base"
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </div>
              )}
            </div>

            {/* Project Name */}
            <div>
              <label
                htmlFor="cp-name"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Project Name <span className="text-error">*</span>
              </label>
              <input
                id="cp-name"
                type="text"
                required
                className="w-full bg-white border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container/20 placeholder:text-slate-300"
                placeholder="e.g., Q3 Campaign Refresh"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="cp-description"
                className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2"
              >
                Description{' '}
                <span className="normal-case tracking-normal font-normal text-slate-300">(optional)</span>
              </label>
              <textarea
                id="cp-description"
                rows={3}
                className="w-full bg-white border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary-container/20 resize-none leading-relaxed placeholder:text-slate-300"
                placeholder="What is this project about?"
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
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectModal
