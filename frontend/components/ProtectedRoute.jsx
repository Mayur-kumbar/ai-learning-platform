import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (role && user.role !== role) router.replace('/dashboard');
  }, [ready, user, role, router]);
  if (!ready || !user || (role && user.role !== role)) return null;
  return children;
}
