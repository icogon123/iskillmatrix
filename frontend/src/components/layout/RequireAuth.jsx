import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectAuthStatus, selectUser } from '../../features/auth/authSlice';
import { PageLoader } from '../ui';

export default function RequireAuth({ role }) {
  const status = useSelector(selectAuthStatus);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (status === 'checking') return <PageLoader label="Checking your session…" />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${role === 'admin' ? '/admin/login' : '/login'}?next=${next}`} replace />;
  }
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  return <Outlet />;
}
