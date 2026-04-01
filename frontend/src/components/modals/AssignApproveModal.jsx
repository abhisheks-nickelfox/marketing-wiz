import { useState, useEffect } from 'react'
import { teamApi } from '../../lib/api'

const AssignApproveModal = ({ isOpen, onClose, ticket, onApprove }) => {
  const [selectedPriority, setSelectedPriority] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(true)

  const priorities = [
    { value: 'urgent', label: 'Urgent', color: 'bg-red-900' },
    { value: 'high', label: 'High', color: 'bg-red-600' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-600' },
    { value: 'low', label: 'Low', color: 'bg-gray-400' },
  ]

  useEffect(() => {
    if (!isOpen) return
    setLoadingTeam(true)
    teamApi
      .list({ role: 'member' })
      .then((res) => setTeamMembers(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoadingTeam(false))
  }, [isOpen])

  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId)

  const handleApprove = () => {
    if (selectedPriority && selectedMemberId) {
      onApprove({ priority: selectedPriority, assignee_id: selectedMemberId, assigneeName: selectedMember?.name ?? '', deadline: deadline || null })
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-[540px] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">Assign & Approve Ticket</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">
            Select a team member to assign this ticket to.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 space-y-6">
          {/* Ticket Summary */}
          <div className="p-6 bg-surface-container-low border border-outline-variant/30 rounded-lg">
            <div className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1.5">
              Ticket Title
            </div>
            <div className="text-lg font-bold text-on-surface leading-snug">{ticket?.title}</div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Type</span>
                <span className="text-sm font-semibold text-on-surface">{ticket?.type?.replace('_', ' ')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Current Priority</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C84B0E]"></span>
                  <span className="text-sm font-semibold text-on-surface capitalize">{ticket?.priority}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
              Priority <span className="text-[#C84B0E]">*</span>
            </label>
            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-outline-variant/60 rounded-lg text-on-surface-variant text-sm hover:border-outline-variant/100 hover:bg-slate-50 transition-all"
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
              >
                <div className="flex items-center gap-2">
                  {selectedPriority ? (
                    <>
                      <span className={`w-2 h-2 rounded-full ${priorities.find((p) => p.value === selectedPriority)?.color}`}></span>
                      <span className="font-medium text-on-surface capitalize">
                        {priorities.find((p) => p.value === selectedPriority)?.label}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">Select ticket priority...</span>
                  )}
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
              </button>

              {showPriorityDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-outline-variant/30 rounded-lg shadow-xl py-1">
                  {priorities.map((priority) => (
                    <div
                      key={priority.value}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedPriority(priority.value)
                        setShowPriorityDropdown(false)
                      }}
                    >
                      <span className={`w-2 h-2 rounded-full ${priority.color}`}></span>
                      <span className="text-sm font-medium text-on-surface">{priority.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-outline-variant/20 w-full"></div>

          {/* Assign To */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2">
              Assign To <span className="text-[#C84B0E]">*</span>
            </label>
            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-outline-variant/60 rounded-lg text-on-surface-variant text-sm hover:border-outline-variant/100 hover:bg-slate-50 transition-all"
                onClick={() => setShowMemberDropdown(!showMemberDropdown)}
              >
                {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-white text-[9px] font-bold">
                      {selectedMember.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-on-surface">{selectedMember.name}</span>
                  </div>
                ) : (
                  <span className="font-medium">
                    {loadingTeam ? 'Loading team...' : 'Select an agency member...'}
                  </span>
                )}
                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
              </button>

              {showMemberDropdown && !loadingTeam && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-outline-variant/30 rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedMemberId(member.id)
                        setShowMemberDropdown(false)
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-white text-[9px] font-bold">
                        {member.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-on-surface">{member.name}</span>
                      <span className="text-xs text-on-surface-variant ml-auto capitalize">{member.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
              Deadline <span className="text-on-surface-variant/40 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-outline-variant/60 rounded-lg text-sm text-on-surface hover:border-outline-variant/100 focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
            />
          </div>

          {/* Info Note */}
          <div className="p-4 bg-tertiary-fixed/20 border border-tertiary-fixed/30 rounded-lg flex gap-3 items-start">
            <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              info
            </span>
            <p className="text-sm text-on-tertiary-fixed-variant leading-relaxed font-medium">
              Assign & Approve will make this ticket visible to the assigned team member immediately.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3 items-center">
          <button
            className="px-6 py-2.5 bg-white border border-outline-variant/60 text-on-surface font-bold text-sm rounded-lg hover:bg-slate-50 hover:border-outline-variant/100 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-8 py-2.5 bg-[#C84B0E] text-white font-bold text-sm rounded-lg transition-all shadow-sm ${
              selectedPriority && selectedMemberId
                ? 'hover:bg-[#a23800] cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={handleApprove}
            disabled={!selectedPriority || !selectedMemberId}
          >
            Final Approve
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssignApproveModal
