import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import NotificationBell from '../../components/NotificationBell'
import { authApi, dashboardApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const MemberProfile = () => {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    dashboardApi.member().then((res) => setStats(res.data)).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === user?.name) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await authApi.updateProfile({ name: name.trim() })
      const meRes = await authApi.me()
      if (meRes?.data) localStorage.setItem('mw_user', JSON.stringify(meRes.data))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setName(res.data?.name ?? name.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name ?? 'MB').slice(0, 2).toUpperCase()

  return (
    <div className="flex">
      <Sidebar role="member" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-16 bg-[#F9F9F7] flex justify-between items-center px-8 z-40">
        <h1 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant pl-12 md:pl-0">Profile</h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="h-6 w-px bg-outline-variant/20" />
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        </div>
      </header>

      <main className="ml-0 md:ml-[240px] pt-16 min-h-screen bg-surface flex-1">
        <div className="p-6 lg:p-12 max-w-3xl mx-auto">

          {/* Profile Hero */}
          <div className="bg-[#111111] rounded-2xl p-8 lg:p-10 mb-8 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-[#C84B0E] opacity-10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{user?.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
                <span className="mt-3 inline-block px-3 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Team Member
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Assigned', value: stats.total_assigned ?? 0, icon: 'confirmation_number' },
                { label: 'Pending', value: stats.pending_tickets ?? 0, icon: 'pending_actions' },
                { label: 'Hours Logged', value: `${(stats.total_hours_logged ?? 0).toFixed(1)}h`, icon: 'schedule' },
              ].map((s) => (
                <div key={s.label} className="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl mb-2">{s.icon}</span>
                  <p className="text-2xl font-extrabold text-on-surface">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Edit Name */}
          <section className="bg-surface-container-lowest rounded-xl p-6 lg:p-8 mb-6">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-6">
              Edit Profile
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container/20 outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-surface-variant opacity-60 cursor-not-allowed"
                />
                <p className="text-[10px] text-on-surface-variant/50 mt-1.5">Email cannot be changed here.</p>
              </div>

              {error && <p className="text-xs text-error">{error}</p>}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || name.trim() === user?.name}
                  className="px-6 py-2.5 bg-primary-container text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saved && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Saved
                  </span>
                )}
              </div>
            </form>
          </section>

          {/* Account Info */}
          <section className="bg-surface-container-lowest rounded-xl p-6 lg:p-8">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-on-surface-variant/50 mb-6">
              Account Info
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                <span className="text-sm text-on-surface-variant">Role</span>
                <span className="text-sm font-semibold text-on-surface capitalize">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/10">
                <span className="text-sm text-on-surface-variant">Member since</span>
                <span className="text-sm font-semibold text-on-surface">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-on-surface-variant">Account ID</span>
                <span className="text-xs font-mono text-on-surface-variant/60">{user?.id?.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default MemberProfile
