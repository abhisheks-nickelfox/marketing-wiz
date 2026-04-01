import { useEffect } from 'react'

const Toast = ({ message, isVisible, onClose, autoDismissMs = 4000 }) => {
  useEffect(() => {
    if (!isVisible) return
    const t = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(t)
  }, [isVisible, onClose, autoDismissMs])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 bg-[#111111] text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in max-w-sm">
      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">check_circle</span>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white/50 hover:text-white transition-colors ml-1">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  )
}

export default Toast
