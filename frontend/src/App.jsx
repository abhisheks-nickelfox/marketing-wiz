import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import MemberDashboard from './pages/member/Dashboard'
import MemberTicketList from './pages/member/TicketList'
import MemberTicketDetail from './pages/member/TicketDetail'
import AdminTicketList from './pages/admin/TicketList'
import AdminTicketDetail from './pages/admin/TicketDetail'
import TranscriptsList from './pages/admin/TranscriptsList'
import FirmsList from './pages/admin/FirmsList'
import FirmDetail from './pages/admin/FirmDetail'
import AddFirm from './pages/admin/AddFirm'
import TeamList from './pages/admin/TeamList'
import MemberDetail from './pages/admin/MemberDetail'
import MemberEdit from './pages/admin/MemberEdit'
import AddMember from './pages/admin/AddMember'
import AdminProfile from './pages/admin/Profile'
import MemberProfile from './pages/member/Profile'

// Protected route wrapper — redirects to /login if not authenticated
// requiredRole: strict role check ('admin' or 'member')
// requiredPermission: allows admin OR member with that permission key
function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-on-surface-variant text-sm font-medium animate-pulse">
          Loading…
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (requiredPermission) {
    const hasAccess =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      (user.permissions ?? []).includes(requiredPermission)
    if (!hasAccess) {
      return <Navigate to="/member/dashboard" replace />
    }
    return children
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/member/dashboard" replace />
  }

  if (requiredRole === 'member' && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ─── Admin Routes ──────────────────────────────────────────── */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/tickets"
          element={<ProtectedRoute requiredRole="admin"><AdminTicketList /></ProtectedRoute>}
        />
        <Route
          path="/admin/tickets/:id"
          element={<ProtectedRoute requiredRole="admin"><AdminTicketDetail /></ProtectedRoute>}
        />
        <Route
          path="/admin/team"
          element={<ProtectedRoute requiredRole="admin"><TeamList /></ProtectedRoute>}
        />
        <Route
          path="/admin/team/new"
          element={<ProtectedRoute requiredRole="admin"><AddMember /></ProtectedRoute>}
        />
        <Route
          path="/admin/team/:id"
          element={<ProtectedRoute requiredRole="admin"><MemberDetail /></ProtectedRoute>}
        />
        <Route
          path="/admin/team/:id/edit"
          element={<ProtectedRoute requiredRole="admin"><MemberEdit /></ProtectedRoute>}
        />
        <Route
          path="/admin/profile"
          element={<ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute>}
        />

        {/* ─── Permission-gated routes (admin or member with permission) ── */}
        <Route
          path="/admin/firms"
          element={<ProtectedRoute requiredPermission="manage_firms"><FirmsList /></ProtectedRoute>}
        />
        <Route
          path="/admin/firms/new"
          element={<ProtectedRoute requiredPermission="manage_firms"><AddFirm /></ProtectedRoute>}
        />
        <Route
          path="/admin/firms/:id"
          element={<ProtectedRoute requiredPermission="manage_firms"><FirmDetail /></ProtectedRoute>}
        />
        <Route
          path="/admin/transcripts"
          element={<ProtectedRoute requiredPermission="process_transcripts"><TranscriptsList /></ProtectedRoute>}
        />
        <Route
          path="/admin/transcripts/process"
          element={<ProtectedRoute requiredPermission="process_transcripts"><TranscriptsList /></ProtectedRoute>}
        />

        {/* ─── Member Routes ─────────────────────────────────────────── */}
        <Route
          path="/member/dashboard"
          element={<ProtectedRoute requiredRole="member"><MemberDashboard /></ProtectedRoute>}
        />
        <Route
          path="/member/tickets"
          element={<ProtectedRoute requiredRole="member"><MemberTicketList /></ProtectedRoute>}
        />
        <Route
          path="/member/tickets/:id"
          element={<ProtectedRoute requiredRole="member"><MemberTicketDetail /></ProtectedRoute>}
        />
        <Route
          path="/member/profile"
          element={<ProtectedRoute requiredRole="member"><MemberProfile /></ProtectedRoute>}
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
