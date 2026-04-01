import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/member/dashboard')
      }
    } catch (err) {
      setError(err.message ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-fixed-dim">
      <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 bg-surface-container-low">
        {/* Brand Identity Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-black text-2xl tracking-tighter">MW</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-[0.05em] uppercase text-on-surface">MARKETINGWIZ</h1>
        </div>

        {/* Login Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Welcome back</h2>
          <p className="text-on-surface-variant text-sm font-medium">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(26,28,27,0.06)] p-8">
          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                EMAIL
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container placeholder:text-on-surface-variant/40 text-on-surface"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  PASSWORD
                </label>
                <a href="#" className="text-xs font-semibold text-primary-container hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container text-on-surface"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-on-surface-variant/60 hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant/60 pointer-events-none">
                    lock
                  </span>
                </div>
              </div>
            </div>

            {/* TODO: implement remember me */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary-container text-white font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials — development only */}
        {import.meta.env.DEV && (
          <div className="mt-6 w-full max-w-md bg-surface-container-lowest/60 rounded-lg p-4 border border-outline-variant/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-bold text-on-surface">Admin</p>
                <p className="text-on-surface-variant">admin@marketingwiz.io</p>
                <p className="text-on-surface-variant">Admin@1234</p>
              </div>
              <div>
                <p className="font-bold text-on-surface">Member</p>
                <p className="text-on-surface-variant">s.chen@marketingwiz.io</p>
                <p className="text-on-surface-variant">Member@1234</p>
              </div>
            </div>
          </div>
        )}

        {/* Support Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-on-surface-variant font-medium">
            Need help accessing your portal?{' '}
            <a href="#" className="text-primary-container font-bold hover:underline">
              Contact Support
            </a>
          </p>
        </div>

        {/* Copyright */}
        <footer className="mt-auto pt-12 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
            MarketingWiz © 2025
          </p>
        </footer>
      </main>

      {/* Decorative background */}
      <div className="fixed top-0 right-0 w-1/3 h-full pointer-events-none overflow-hidden opacity-20 -z-10">
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-primary-container rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[0%] w-[300px] h-[300px] bg-tertiary-container rounded-full blur-[100px]"></div>
      </div>
    </div>
  )
}

export default Login
