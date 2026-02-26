import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Pipeline from './pages/Pipeline';
import Team from './pages/Team';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import HarvestSync from './pages/HarvestSync';
import AdminUsers from './pages/AdminUsers';
import LoadingSpinner from './components/ui/LoadingSpinner';

function ProtectedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/team" element={<Team />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/harvest" element={<HarvestSync />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProtectedApp />
      </ToastProvider>
    </AuthProvider>
  );
}
