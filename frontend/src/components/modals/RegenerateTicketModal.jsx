import { useState } from 'react'

const RegenerateTicketModal = ({ isOpen, onClose, ticket, onRegenerate }) => {
  const [instruction, setInstruction] = useState('')

  const handleRegenerate = () => {
    onRegenerate({ instruction })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-[600px] bg-white rounded-lg shadow-[0px_20px_48px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Regenerate Ticket</h1>
          <p className="text-on-surface-variant/70 text-sm mt-2">
            Provide additional instruction. The AI will re-run using the original transcript.
          </p>
        </div>

        <div className="px-8 pb-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Original Ticket */}
          <section className="pt-4 border-t border-outline-variant/20">
            <label className="block text-[11px] font-bold tracking-[0.08em] text-on-surface-variant/60 uppercase mb-4">
              Original Ticket
            </label>
            <div className="bg-surface-container-low/50 p-6 rounded-lg border border-outline-variant/30">
              <div className="flex flex-col gap-5">
                <div className="flex items-start">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase w-20 pt-1">
                    Title
                  </span>
                  <span className="font-bold text-on-surface text-lg">{ticket?.title}</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center flex-1">
                    <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase w-20">
                      Type
                    </span>
                    <span className="text-on-surface text-sm font-medium">{ticket?.type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase mr-3">
                      Priority
                    </span>
                    <span className="text-[#C84B0E] font-bold text-sm">{ticket?.priority}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-outline-variant/10 flex items-start">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase w-20 pt-1">
                    Desc
                  </span>
                  <p className="italic text-on-surface-variant text-sm leading-relaxed flex-1">
                    "{ticket?.description}"
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Transcript Reference */}
          <section className="pt-4 border-t border-outline-variant/20">
            <label className="block text-[11px] font-bold tracking-[0.08em] text-on-surface-variant/60 uppercase mb-4">
              Transcript Reference
            </label>
            <div className="bg-[#1A1A1A] p-6 rounded-lg font-mono text-sm leading-relaxed">
              <p className="text-white/90">
                <span className="text-[#C84B0E] font-bold">Craig:</span> Alright everyone, thanks for joining the call. Today we're diving into the Aurora Retail Group onboarding. I want to make sure we capture all the specific KPIs they mentioned in the last email.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">database</span>
              <p className="text-[11px] font-medium text-on-surface-variant/50">
                Read from local database — no Fireflies API call
              </p>
            </div>
          </section>

          {/* Instruction */}
          <section className="pt-4 border-t border-outline-variant/20">
            <label className="block text-[11px] font-bold tracking-[0.08em] text-on-surface-variant/60 uppercase mb-4">
              Instruction
            </label>
            <div className="relative group">
              <textarea
                className="w-full min-h-[140px] bg-surface-container-low p-5 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/30 border-none focus:ring-1 focus:ring-[#C84B0E]/20 transition-all resize-none"
                placeholder="e.g. Include specific logic for the 'Express Interest' tag mentioned in the call..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              ></textarea>
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-outline-variant/10">
                <span className="text-[#C84B0E] text-[9px] font-black tracking-widest">
                  ✦ CONTEXTUAL AI ACTIVE
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-surface-container-low/30 border-t border-outline-variant/10 flex justify-between items-center">
          <button
            className="px-8 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-8 py-3 rounded-lg bg-[#C84B0E] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#A33D0B] transition-colors shadow-sm"
            onClick={handleRegenerate}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            Regenerate
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegenerateTicketModal
