import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { authApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const AdminProfile = () => {
  const { user, login } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === user?.name) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await authApi.updateProfile({ name: name.trim() })
      // Refresh user in context by calling me() again via re-login trick
      const meRes = await authApi.me()
      if (meRes?.data) {
        // Update localStorage user data
        localStorage.setItem('mw_user', JSON.stringify(meRes.data))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // Update displayed name without page reload
      setName(res.data?.name ?? name.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name ?? 'AD').slice(0, 2).toUpperCase()

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* TopNav */}
      <header className="fixed top-0 left-0 md:left-[240px] right-0 h-16 bg-[#F4F4F2] flex items-center px-4 sm:px-8 z-40">
        <h1 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant pl-12 md:pl-0">Profile</h1>
      </header>

      <main className="ml-0 md:ml-[240px] pt-16 min-h-screen bg-surface-container-low flex-1">
        <div className="p-6 lg:p-12 max-w-3xl mx-auto">

          {/* Profile Hero */}
          <div className="bg-[#111111] rounded-2xl p-8 lg:p-10 mb-8 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-[#C84B0E] opacity-10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#C84B0E] flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{user?.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
                <span className="mt-3 inline-block px-3 py-1 bg-[#C84B0E]/20 text-[#C84B0E] text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Administrator
                </span>
              </div>
            </div>
          </div>

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
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-[#C84B0E]/20 outline-none"
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

              {error && (
                <p className="text-xs text-error">{error}</p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || name.trim() === user?.name}
                  className="px-6 py-2.5 bg-[#C84B0E] text-white text-xs font-bold rounded-lg hover:bg-[#a23800] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

export default AdminProfile
