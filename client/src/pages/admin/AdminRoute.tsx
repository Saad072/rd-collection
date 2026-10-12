import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminRoute() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" state={{ from: '/admin', adminOnly: true }} replace />
    );
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
