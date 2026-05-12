import { createBrowserRouter, Navigate } from 'react-router';
import { useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StudentLayout } from './components/StudentLayout';
import { AdminLayout } from './components/AdminLayout';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentPayments } from './pages/student/Payments';
import { StudentIssues } from './pages/student/Issues';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminRooms } from './pages/admin/Rooms';
import { AdminStudents } from './pages/admin/Students';
import { AdminPayments } from './pages/admin/Payments';
import { AdminIssues } from './pages/admin/Issues';
import { AdminReports } from './pages/admin/Reports';
import { Settings } from './pages/Settings';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'student' | 'admin' }) {
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
}

// Root redirect based on user role
function RootRedirect() {
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute requiredRole="student">
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <StudentDashboard />,
      },
      {
        path: 'payments',
        element: <StudentPayments />,
      },
      {
        path: 'issues',
        element: <StudentIssues />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'rooms',
        element: <AdminRooms />,
      },
      {
        path: 'students',
        element: <AdminStudents />,
      },
      {
        path: 'payments',
        element: <AdminPayments />,
      },
      {
        path: 'issues',
        element: <AdminIssues />,
      },
      {
        path: 'reports',
        element: <AdminReports />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
