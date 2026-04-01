import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { teamApi } from '../../lib/api'
import { PERMISSIONS } from '../../lib/permissions'

const AddMember = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
    permissions: [],
  })

  const togglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }))
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Full name is required')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await teamApi.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        permissions: formData.role === 'admin' ? [] : formData.permissions,
      })
      navigate('/admin/team')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate('/admin/team')
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-surface flex-1">
        {/* TopNavBar */}
        <header className="fixed top-0 left-[240px] right-0 h-[88px] bg-surface-container-low flex justify-between items-center px-12 z-40">
          <div className="flex flex-col">
            <h2 className="font-bold text-2xl tracking-tight text-on-surface">Add New Member</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Admin Panel / Team
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 text-on-surface-variant">
              <button className="p-2 hover:bg-surface-container-high rounded-full transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/30"></div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDiscard}
                className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
                type="button"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 bg-primary-container text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-container/20 active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Member'}
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
                Add New Team Member
              </h1>
              <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
                Create a new team member account. They will be able to log in with the credentials you set here.
              </p>
            </section>

            {error && (
              <div className="mb-8 p-4 bg-error-container text-on-error-container rounded-xl text-sm">{error}</div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-12 gap-12">
                {/* Account Details */}
                <div className="col-span-12 lg:col-span-7 space-y-10">
                  <div className="bg-surface-container-lowest p-8 rounded-xl">
                    <h3 className="font-bold text-xs tracking-widest text-on-surface-variant uppercase mb-8">
                      Account Details
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                          Full Name *
                        </label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium transition-all"
                          type="text"
                          placeholder="e.g. John Smith"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                          Email Address *
                        </label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium transition-all"
                          type="email"
                          placeholder="john.smith@agency.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                          Password * <span className="text-on-surface-variant/50 normal-case tracking-normal">(min 8 characters)</span>
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 pr-14 focus:ring-2 focus:ring-primary-container/20 text-on-surface font-medium transition-all"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Set a secure password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            <span className="material-symbols-outlined">
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions */}
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
                          onClick={() => handleInputChange('role', opt.value)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                            formData.role === opt.value
                              ? 'border-primary-container bg-primary-container/5'
                              : 'border-transparent bg-surface-container-low hover:border-outline-variant'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            formData.role === opt.value ? 'bg-primary-container' : 'bg-surface-container-high'
                          }`}>
                            <span className={`material-symbols-outlined text-sm ${
                              formData.role === opt.value ? 'text-white' : 'text-on-surface-variant'
                            }`}>
                              {opt.value === 'admin' ? 'shield' : 'person'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-on-surface">{opt.label}</p>
                            <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                          </div>
                          {formData.role === opt.value && (
                            <span className="ml-auto material-symbols-outlined text-primary-container text-sm">check_circle</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {formData.role === 'member' && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                          Permissions
                        </p>
                        <div className="space-y-2">
                          {PERMISSIONS.map((perm) => (
                            <label
                              key={perm.key}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(perm.key)}
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

                    {formData.role === 'admin' && (
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
                        Admins have full access to all portal features and cannot be restricted by permissions.
                      </p>
                    )}
                  </div>

                  {/* Invitation Info */}
                  <div className="p-8 border-l-2 border-primary-container/20 bg-primary-container/5 rounded-r-xl">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary-container">info</span>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface mb-1">Login Credentials</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Share the email and password with the new user. They can sign in immediately at the login page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Action Bar */}
              <div className="mt-16 pt-8 border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-6 text-on-surface-variant text-xs">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    Member account will be created in Supabase Auth
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary-container text-white px-12 py-4 rounded-xl font-bold text-sm shadow-xl shadow-primary-container/20 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    {saving ? 'Creating...' : formData.role === 'admin' ? 'Create Admin' : 'Create Member'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AddMember
