import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { firmsApi } from '../../lib/api'

const AddFirm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Firm name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await firmsApi.create({
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
      })
      navigate('/admin/firms')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate('/admin/firms')
  }

  return (
    <div className="flex">
      <Sidebar role="admin" />

      {/* Main Content Area */}
      <main className="ml-0 md:ml-[240px] min-h-screen flex flex-col bg-background flex-1">
        {/* Top Navigation */}
        <header className="flex justify-between items-center h-20 px-12 sticky top-0 z-40 bg-[#F9F9F7] transition-colors duration-200">
          <div className="flex flex-col">
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-outline mb-1">
              <span
                className="hover:text-primary transition-colors cursor-pointer"
                onClick={() => navigate('/admin/firms')}
              >
                Firms
              </span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-primary-container">Add New Firm</span>
            </nav>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-on-surface">Add New Firm</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        {/* Content Canvas */}
        <section className="flex-1 px-12 py-12 flex justify-center">
          <div className="w-full max-w-4xl">
            {/* Form Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(26,28,27,0.06)] p-10">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-on-surface">Firm Details</h3>
                  <p className="text-sm text-outline mt-1 font-medium">
                    Fill in the essential information to register a new client firm.
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    domain_add
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {/* Firm Name */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-outline ml-1">
                      Firm Name *
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary-container/20 transition-all text-on-surface placeholder:text-outline/40"
                      placeholder="e.g. Zenith Marketing Group"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-outline ml-1">
                      Primary Contact Name
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary-container/20 transition-all text-on-surface placeholder:text-outline/40"
                      placeholder="e.g. Alexander Pierce"
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-outline ml-1">
                      Contact Email
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary-container/20 transition-all text-on-surface placeholder:text-outline/40"
                      placeholder="contact@firm.com"
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 flex items-center justify-between border-t border-surface-container-high mt-4">
                  <button
                    className="text-sm font-bold text-outline hover:text-on-surface transition-colors px-4"
                    type="button"
                    onClick={handleDiscard}
                  >
                    Discard Changes
                  </button>
                  <button
                    className="bg-primary-container text-white px-10 py-3.5 rounded-lg font-bold text-sm tracking-wide shadow-lg shadow-primary-container/20 hover:bg-primary transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-60"
                    type="submit"
                    disabled={saving}
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    {saving ? 'Saving...' : 'Save Firm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AddFirm
