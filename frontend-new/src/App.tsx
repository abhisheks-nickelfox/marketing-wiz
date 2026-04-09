import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import AddUserPage from './pages/AddUserPage';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetLinkSent from './pages/auth/ResetLinkSent';
import EmailPreview from './pages/auth/EmailPreview';

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login"            element={<Login />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-link-sent"  element={<ResetLinkSent />} />
        <Route path="/email-preview"    element={<EmailPreview />} />

        {/* App shell */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users"     element={<UsersPageWrapper />} />
          <Route path="/users/new" element={<AddUserPage />} />
        </Route>

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function UsersPageWrapper() {
  const location = useLocation();
  const showToast = (location.state as { showToast?: boolean } | null)?.showToast ?? false;
  return <UsersPage showToast={showToast} />;
}
