const TicketConfirmationModal = ({ isOpen, onClose, ticket, assignee, priority, firm }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-surface-dim/40 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(26,28,27,0.12)] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          className="absolute top-8 right-8 text-zinc-400 hover:text-on-surface transition-colors z-10"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>

        {/* Content */}
        <div className="p-12 flex flex-col items-center">
          {/* Success Header */}
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-green-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-3">
              Ticket Successfully Approved & Assigned
            </h2>
            <p className="text-on-surface-variant text-lg max-w-md">
              The ticket is now active and the team member has been notified.
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full bg-surface-container-low rounded-xl p-8 mb-12 shadow-sm ring-1 ring-outline-variant/20">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400 mb-2 block">
                  TICKET TITLE
                </label>
                <p className="text-xl font-bold text-on-surface">{ticket?.title || 'Untitled Ticket'}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-50">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400 mb-3 block">
                    ASSIGNEE
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-surface-container-high">
                      <img
                        alt={assignee?.name || 'Team Member'}
                        className="h-full w-full object-cover"
                        src={assignee?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-LGdDEBCNs6arBkmdllAE2FBGZvgFzpXjBH3j_DfEQpEaqkvBlB2j8IKRbXHp8otwBdK8UjucmTqWEGZPh7AXlJZQrCG1O6yeYXBezQR4jm2u-VUJSBuzX2fygnwKROBBx5HLIoD5e0aVzs4ZG5aFl9rXxjacaZrYjN_Z_dT4DtJnrPUFWhq2oQm491k0AVXIerTyB4AStlfxtyGqydTRxRrBb8FsZakSmdB9BzkeTD-YNpmTvgp2vO_4qdUAQx1g1GjZatgeMl8'}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{assignee?.name || 'Team Member'}</p>
                      <p className="text-xs text-on-surface-variant">{assignee?.role || 'Senior Member'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400 mb-3 block">
                    FIRM
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-400">business</span>
                    <p className="text-sm font-bold text-on-surface">{firm || 'Client Firm'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400 mb-3 block">
                    PRIORITY
                  </label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                    priority === 'high' || priority === 'urgent'
                      ? 'bg-error-container text-on-error-container'
                      : priority === 'medium'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400 mb-3 block">
                    STATUS
                  </label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">
                    Approved
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Section */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="col-span-1">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">What's next?</h3>
            </div>
            <div className="col-span-2 space-y-4">
              <div className="flex gap-4">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {assignee?.name || 'The team member'} will receive a notification and can start logging time.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  You can track progress on the 'All Tickets' page.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  The firm '{firm || 'Client'}' now has active tickets.
                </p>
              </div>
            </div>
          </div>

          {/* Button Row */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button 
              className="px-10 py-4 bg-primary-container text-white text-sm font-bold rounded-xl hover:bg-primary transition-all active:scale-95 shadow-lg shadow-primary-container/20"
              onClick={onClose}
            >
              Go to All Tickets
            </button>
            <button 
              className="px-10 py-4 bg-surface-container-lowest border border-outline-variant/30 text-primary text-sm font-bold rounded-xl hover:bg-zinc-50 transition-all active:scale-95"
              onClick={onClose}
            >
              Back to {firm || 'Firm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketConfirmationModal
