import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
import DashboardLayout from '@/layout/DashboardLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Leads from '@/pages/Leads';
import LeadDetail from '@/pages/LeadDetail';
import Companies from '@/pages/Companies';
import FollowUps from '@/pages/FollowUps';
import Calls from '@/pages/Calls';
import Employees from '@/pages/Employees';
import Developers from '@/pages/Developers';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import MyTasks from '@/pages/MyTasks';
import Analytics from '@/pages/Analytics';
import ActivityLogs from '@/pages/ActivityLogs';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<ProtectedRoute roles={['admin', 'employee']}><Leads /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute roles={['admin', 'employee']}><LeadDetail /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute roles={['admin', 'employee']}><Companies /></ProtectedRoute>} />
        <Route path="/followups" element={<ProtectedRoute roles={['admin', 'employee']}><FollowUps /></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute roles={['admin', 'employee']}><Calls /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute roles={['admin']}><Employees /></ProtectedRoute>} />
        <Route path="/developers" element={<ProtectedRoute roles={['admin', 'employee']}><Developers /></ProtectedRoute>} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tasks" element={<MyTasks />} />
        <Route path="/analytics" element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute roles={['admin']}><ActivityLogs /></ProtectedRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
