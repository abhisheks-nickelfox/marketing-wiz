import { useState, useEffect } from 'react'

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

const EditTicketModal = ({ isOpen, onClose, ticket, onSave }) => {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('normal')
  const [type, setType] = useState('task')
  const [description, setDescription] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [titleError, setTitleError] = useState('')
  const [changeNoteError, setChangeNoteError] = useState('')

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '')
      setPriority(ticket.priority || 'normal')
      setType(ticket.type || 'task')
      setDescription(ticket.description || '')
      setChangeNote(ticket.change_note || '')
      setTitleError('')
      setChangeNoteError('')
    }
  }, [ticket])

  const isApproved = ticket?.status === 'approved'

  const handleSave = () => {
    let valid = true
    if (!title.trim()) {
      setTitleError('Title is required')
      valid = false
    } else {
      setTitleError('')
    }
    if (isApproved && !changeNote.trim()) {
      setChangeNoteError('Change note is required when editing an approved ticket')
      valid = false
    } else {
      setChangeNoteError('')
    }
    if (!valid) return
    onSave({ title: title.trim(), priority, type, description, change_note: changeNote })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-surface-dim/40 backdrop-blur-md">
      <div className="w-full max-w-[520px] bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(26,28,27,0.08)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-6 px-8 flex flex-col items-center border-b border-outline-variant/10">
          <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded-sm mb-3">
            <span className="text-white font-black text-sm">MW</span>
          </div>
          <h3 className="font-headline font-extrabold text-xl tracking-tight text-on-surface">
            Edit Ticket Details
          </h3>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          {/* Ticket Title */}
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
              Ticket Title *
            </label>
            <input
              className={`w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium ${titleError ? 'ring-2 ring-error' : ''}`}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError('') }}
            />
            {titleError && <p className="mt-1 text-xs text-error">{titleError}</p>}
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                Type
              </label>
              <div className="relative">
                <select
                  className="w-full bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 appearance-none font-medium"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {TICKET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                Priority
              </label>
              <div className="relative">
                <select
                  className="w-full bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 appearance-none font-medium"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
              Description
            </label>
            <textarea
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium resize-none leading-relaxed"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Change Note */}
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
              Change Note{' '}
              {isApproved
                ? <span className="text-error">*</span>
                : <span className="text-slate-300">(optional)</span>
              }
            </label>
            <input
              className={`w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium ${changeNoteError ? 'ring-2 ring-error' : ''}`}
              type="text"
              placeholder="Briefly describe what changed..."
              value={changeNote}
              onChange={(e) => { setChangeNote(e.target.value); if (e.target.value.trim()) setChangeNoteError('') }}
            />
            {changeNoteError && <p className="mt-1 text-xs text-error">{changeNoteError}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2 flex justify-end gap-3">
          <button
            className="px-6 py-3 bg-surface-container-lowest text-primary font-bold text-sm rounded-xl outline outline-1 outline-outline-variant/20 hover:bg-surface-container-low transition-colors duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-8 py-3 bg-primary-container text-on-primary-container font-bold text-sm rounded-xl shadow-[0_4px_12px_rgba(200,75,14,0.2)] hover:bg-primary transition-colors duration-200"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditTicketModal
