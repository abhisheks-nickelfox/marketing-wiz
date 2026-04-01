import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, timeAgo } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const NotificationBell = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)

  // Fetch unread count on mount and every 30s
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.unreadCount()
      setUnreadCount(res.data?.count ?? 0)
    } catch {
      // silent
    }
  }

  const handleOpen = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await notificationsApi.list()
      setNotifications(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (notif) => {
    if (!notif.read) {
      await notificationsApi.markRead(notif.id).catch(() => {})
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (notif.ticket_id) {
      setOpen(false)
      const basePath = (user?.role === 'admin' || user?.role === 'super_admin')
        ? '/admin/tickets'
        : '/member/tickets'
      navigate(`${basePath}/${notif.ticket_id}`)
    }
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#C84B0E] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-[360px] bg-white rounded-xl shadow-2xl border border-outline-variant/10 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-[#C84B0E]/10 text-[#C84B0E] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="py-10 text-center text-sm text-on-surface-variant animate-pulse">
                Loading…
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-4xl block mb-2">notifications_none</span>
                <p className="text-sm text-on-surface-variant">No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleMarkRead(notif)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/5 last:border-0 ${
                  !notif.read ? 'bg-[#C84B0E]/3' : ''
                }`}
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-[#C84B0E]' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${!notif.read ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{notif.message}</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-1">{timeAgo(notif.created_at)}</p>
                </div>
                {notif.ticket_id && (
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-sm flex-shrink-0 mt-0.5">chevron_right</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
