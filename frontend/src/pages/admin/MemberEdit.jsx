import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { teamApi, formatDate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS } from '../../lib/permissions'

const MemberEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [role, setRole] = useState('member')
  const [permissions, setPermissions] = useState([])

  const togglePermission = (key) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  // Password reset state
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    teamApi
      .get(id)
      .then((res) => {
        const m = res.data
        setMember(m)
        setName(m.name ?? '')
        setRole(m.role ?? 'member')
        setPermissions(m.permissions ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await teamApi.update(id, {
        name: name.trim(),
        role,
        permissions: role === 'admin' ? [] : permissions,
      })
      navigate('/admin/team')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await teamApi.update(id, { password: newPassword })
      setNewPassword('')
      setPasswordSuccess(true)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDiscard = () => {
    navigate('/admin/team')
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await teamApi.delete(id)
      navigate('/admin/team')
    } catch (err) {
      setError(err.message)
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen flex items-center justify-center flex-1">
          <p className="text-on-surface-variant animate-pulse">Loading member...</p>
        </main>
      </div>
    )
  }

  if (error && !member) {
    return (
      <div className="flex">
        <Sidebar role="admin" />
        <main className="ml-0 md:ml-[240px] min-h-screen flex items-center justify-center flex-1">
          <p className="text-error">{error}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-surface flex-1">
        {/* TopNavBar */}
        <header className="fixed top-0 left-[240px] right-0 h-[88px] bg-surface-container-low flex justify-between items-center px-12 z-40">
          <div className="flex flex-col">
            <h2 className="font-bold text-2xl tracking-tight text-on-surface">Edit Member Profile</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Admin Panel / Team
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="h-8 w-[1px] bg-outline-variant/30"></div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDiscard}
                className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2.5 bg-primary-container text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-container/20 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <div className="mt-[88px] min-h-[calc(100vh-88px)] p-12 bg-surface">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <section className="mb-12">
              <h1 className="font-extrabold text-5xl tracking-tight text-on-background mb-4">
                Edit Member Profile — {member?.name}
              </h1>
              <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
                Update account details. Changes will reflect across the portal immediately upon saving.
              </p>
            </section>

            {error && (
              <div className="mb-8 p-4 bg-error-container text-on-error-container rounded-xl text-sm">{error}</div>
            )}

            {/* Form Content */}
            <div className="grid grid-cols-12 gap-12">
              {/* Column 1: Account Details */}
              <div className="col-span-12 lg:col-span-7 space-y-10">
                <div className="bg-surface-container-lowest p-8 rounded-xl">
                  <h3 className="font-bold text-xs tracking-widest text-on-surface-variant uppercase mb-8">
                    Account Details
                  </h3>
                  {/* Avatar */}
                  <div className="flex items-center gap-8 mb-10">
                    <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center text-white font-black text-4xl">
                      {name?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{name}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{member?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                        Full Name
                      </label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium transition-all"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                        Email Address
                      </label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-on-surface font-medium opacity-60 cursor-not-allowed"
                        type="email"
                        value={member?.email ?? ''}
                        disabled
                        title="Email cannot be changed"
                      />
                      <p className="text-[10px] text-on-surface-variant ml-1">Email cannot be changed after account creation.</p>
                    </div>
                  </div>
                </div>

                {/* Ticket Stats */}
                {member && (
                  <div className="bg-surface-container-lowest p-8 rounded-xl">
                    <h3 className="font-bold text-xs tracking-widest text-on-surface-variant uppercase mb-6">
                      Activity Stats
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-surface-container-low rounded-xl">
                        <p className="text-2xl font-black text-primary-container">{member.assigned_count ?? 0}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Assigned</p>
                      </div>
                      <div className="text-center p-4 bg-surface-container-low rounded-xl">
                        <p className="text-2xl font-black text-on-surface">{member.pending_count ?? 0}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Pending</p>
                      </div>
                      <div className="text-center p-4 bg-surface-container-low rounded-xl">
                        <p className="text-2xl font-black text-primary-container">{member.resolved_count ?? 0}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Resolved</p>
                      </div>
                      <div className="text-center p-4 bg-surface-container-low rounded-xl">
                        <p className="text-2xl font-black text-on-surface">
                          {member.total_hours_logged != null ? `${member.total_hours_logged}h` : '—'}
                        </p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Hours</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Role & Info */}
              <div className="col-span-12 lg:col-span-5 space-y-10">
                <div className="bg-surface-container-lowest p-8 rounded-xl">
                  <h3 className="font-bold text-xs tracking-widest text-on-surface-variant uppercase mb-8">
                    Role &amp; Access
                  </h3>
                  <div className="space-y-3 mb-6">
                    {[
                      { value: 'member', label: 'Team Member', desc: 'Assigned ticket access only' },
                      { value: 'admin', label: 'Admin', desc: 'Full portal access' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          role === opt.value
                            ? 'border-primary-container bg-primary-container/5'
                            : 'border-transparent bg-surface-container-low hover:border-outline-variant'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          role === opt.value ? 'bg-primary-container' : 'bg-surface-container-high'
                        }`}>
                          <span className={`material-symbols-outlined text-sm ${
                            role === opt.value ? 'text-white' : 'text-on-surface-variant'
                          }`}>
                            {opt.value === 'admin' ? 'shield' : 'person'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface">{opt.label}</p>
                          <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                        </div>
                        {role === opt.value && (
                          <span className="ml-auto material-symbols-outlined text-primary-container text-sm">check_circle</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {role === 'member' && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                        Permissions
                      </p>
                      <div className="space-y-2">
                        {PERMISSIONS.map((perm) => (
                          <label
                            key={perm.key}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={permissions.includes(perm.key)}
                              onChange={() => togglePermission(perm.key)}
                              className="mt-0.5 accent-[#C84B0E] w-4 h-4 shrink-0"
                            />
                            <div>
                              <p className="text-xs font-bold text-on-surface">{perm.label}</p>
                              <p className="text-[10px] text-on-surface-variant">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {role === 'admin' && (
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
                      Admins have full access to all portal features.
                    </p>
                  )}

                  <div className="mt-6 pt-6 border-t border-surface-container-low">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                      Member Since
                    </label>
                    <div className="px-6 py-4 bg-surface-container-low rounded-xl font-medium text-on-surface">
                      {formatDate(member?.created_at)}
                    </div>
                  </div>
                </div>

                {/* Password Reset */}
                <div className="bg-surface-container-lowest p-8 rounded-xl">
                  <h3 className="font-bold text-xs tracking-widest text-on-surface-variant uppercase mb-6">
                    Reset Password
                  </h3>
                  {passwordSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                      Password updated successfully.
                    </div>
                  )}
                  {passwordError && (
                    <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm">{passwordError}</div>
                  )}
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 pr-14 text-on-surface font-medium focus:ring-2 focus:ring-primary-container/20"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New password (min 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        <span className="material-symbols-outlined">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <button
                      onClick={handlePasswordReset}
                      disabled={savingPassword || newPassword.length < 8}
                      className="w-full py-3 bg-primary-container text-white font-bold text-sm rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
                    >
                      {savingPassword ? 'Updating...' : 'Reset Password'}
                    </button>
                  </div>
                </div>

                {/* Side Note */}
                <div className="p-8 border-l-2 border-primary-container/20 bg-primary-container/5 rounded-r-xl">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-primary-container">info</span>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface mb-1">What can be changed?</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Display name and password can be updated here. Email changes require admin action in Supabase directly.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danger Zone — super admin only, never shown for own account */}
                {isSuperAdmin && id !== currentUser?.id && (
                  <div className="p-8 border border-red-100 rounded-xl bg-red-50/40">
                    <h3 className="font-bold text-xs tracking-widest text-red-400 uppercase mb-4">
                      Danger Zone
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                      Permanently delete this user. This removes their Supabase Auth account and all profile data. This cannot be undone.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">delete_forever</span>
                      Delete User
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="mt-16 pt-8 border-t border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-6 text-on-surface-variant text-xs">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Joined {formatDate(member?.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={handleDiscard}
                  className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary-container text-white px-12 py-4 rounded-xl font-bold text-sm shadow-xl shadow-primary-container/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Member Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-red-500">warning</span>
            </div>
            <h3 className="font-extrabold text-xl text-on-surface mb-2">Delete User</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Permanently delete <strong>{member?.name}</strong>? This removes their account and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberEdit
