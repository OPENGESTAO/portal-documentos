// src/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
import App from './App';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import DocumentList from './pages/DocumentList';
import LogsPage from './pages/LogsPage'; // Import the new LogsPage
import ConsultClientsPage from './pages/ConsultClientsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/users" element={<UserManagementPage />} />
      <Route path="/documents" element={<DocumentManagementPage />} />
      <Route path="/document-list" element={<DocumentList />} />
      <Route path="/logs" element={<LogsPage />} /> {/* Update this line */}
      <Route path="/consult-clients" element={<ConsultClientsPage />} />
    </Routes>
  );
}