import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  );
}