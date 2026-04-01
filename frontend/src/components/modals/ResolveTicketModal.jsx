import { useState, useEffect } from 'react'
import { decimalToHoursMinutes, hoursMinutesToDecimal } from '../../lib/api'

const ResolveTicketModal = ({ isOpen, onClose, onConfirm, ticketData }) => {
  const [estHrs, setEstHrs] = useState(0)
  const [estMins, setEstMins] = useState(0)

  useEffect(() => {
    if (isOpen) {
      const { hrs, mins } = decimalToHoursMinutes(ticketData?.estimatedHours)
      setEstHrs(hrs)
      setEstMins(mins)
    }
  }, [isOpen, ticketData?.estimatedHours])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      hours: hoursMinutesToDecimal(estHrs, estMins),
      totalTimeSpent: ticketData.totalTimeSpent,
      finalComment: formData.get('finalComment'),
    }
    onConfirm(data)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#1A1C1B]/60" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-[560px] bg-white rounded-lg shadow-[0px_16px_48px_rgba(0,0,0,0.12)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-8 pb-6">
          <h3 className="text-2xl font-bold tracking-tight text-[#1A1C1B]">Mark as Resolved</h3>
          <p className="text-[#594139] mt-2 font-medium">Confirm your final time and add a wrap-up note.</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#EEEEEC] mx-8"></div>

        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          {/* Fields Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-widest text-[#594139] uppercase">
                Estimated Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={estHrs}
                  onChange={(e) => setEstHrs(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-surface-container-low rounded-lg text-sm font-bold text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-on-surface-variant">h</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={estMins}
                  onChange={(e) => setEstMins(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-surface-container-low rounded-lg text-sm font-bold text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-on-surface-variant">m</span>
              </div>
            </div>

            {/* Right Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-widest text-[#594139] uppercase">
                Total Time Spent
              </label>
              <div className="w-full bg-[#EEEEEC] rounded-lg px-4 py-3.5 text-[#594139] font-semibold flex items-center">
                {ticketData.totalTimeSpent || '—'}
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold tracking-widest text-[#594139] uppercase">
              Final Comment
            </label>
            <textarea
              className="w-full bg-[#F4F4F2] border-none rounded-lg px-4 py-3.5 text-[#1A1C1B] placeholder:text-[#8C7167]/40 focus:ring-2 ring-[#C84B0E]/20 transition-all resize-none font-medium"
              placeholder="Summarize the final outcome..."
              rows="4"
              name="finalComment"
            ></textarea>
          </div>

          {/* Info Box */}
          <div className="bg-[#FFF8F1] border border-[#FFDBCE] rounded-lg p-4 flex gap-3">
            <span
              className="material-symbols-outlined text-[#C84B0E] text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              info
            </span>
            <p className="text-xs text-[#802A00] leading-relaxed font-medium">
              A final log entry will be created automatically. Admin view will update in real-time.
            </p>
          </div>

          {/* Button Row */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              className="px-6 py-3 rounded-lg text-sm font-bold text-[#A23800] hover:bg-[#F4F4F2] transition-all border border-transparent outline-none"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="bg-[#C84B0E] text-white px-8 py-3 rounded-lg text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
              type="submit"
            >
              Confirm Resolved
              <span
                className="material-symbols-outlined text-xl leading-none"
                style={{ fontVariationSettings: "'wght' 600" }}
              >
                check
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResolveTicketModal
