import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Derive role from auth context — ignore any hardcoded prop from the page
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const perms = user?.permissions ?? []

  const adminLinks = [
    { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/transcripts', icon: 'description', label: 'Transcripts' },
    { path: '/admin/projects', icon: 'folder', label: 'Projects' },
    { path: '/admin/firms', icon: 'business', label: 'Firms' },
    { path: '/admin/tickets', icon: 'confirmation_number', label: 'Tickets' },
    { path: '/admin/team', icon: 'group', label: 'Team' },
  ]

  const memberLinks = [
    { path: '/member/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/member/tickets', icon: 'confirmation_number', label: 'Tickets' },
    ...(perms.includes('process_transcripts')
      ? [{ path: '/admin/transcripts', icon: 'description', label: 'Transcripts' }]
      : []),
    ...(perms.includes('manage_projects')
      ? [{ path: '/admin/projects', icon: 'folder', label: 'Projects' }]
      : []),
    ...(perms.includes('manage_firms')
      ? [{ path: '/admin/firms', icon: 'business', label: 'Firms' }]
      : []),
  ]

  const links = isAdmin ? adminLinks : memberLinks

  const handleLogout = async () => {
    setMobileOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile hamburger — always visible on small screens */}
      <button
        className="fixed top-4 left-4 z-[60] md:hidden bg-[#111111] text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[49] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-[240px] bg-[#111111] font-['Inter'] antialiased tracking-tight
          flex flex-col py-8 px-0 z-50 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="px-6 mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-[0.05em] uppercase">MARKETINGWIZ</h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-[0.1em] uppercase mt-1">AGENCY PORTAL</p>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow flex flex-col">
          {links.map((link) => {
            const isActive =
              location.pathname === link.path ||
              location.pathname.startsWith(link.path + '/')
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-6 py-4 transition-all duration-200 ${
                  isActive
                    ? 'border-l-4 border-[#C84B0E] bg-white/5 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer — Profile + Logout */}
        <div className="px-6 mt-auto border-t border-white/5 pt-4">
          <Link
            to={isAdmin ? '/admin/profile' : '/member/profile'}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 py-3 w-full rounded-lg px-2 transition-all ${
              location.pathname.endsWith('/profile')
                ? 'bg-white/5 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#C84B0E]/80 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {(user?.name ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name ?? 'Profile'}</p>
              <p className="text-[9px] capitalize" style={{ color: isSuperAdmin ? '#C84B0E' : undefined }}>
                {isSuperAdmin ? 'Super Admin' : user?.role}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-400 hover:text-white transition-colors py-3 w-full text-left px-2"
          >
            <span className="material-symbols-outlined mr-3 text-lg">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
