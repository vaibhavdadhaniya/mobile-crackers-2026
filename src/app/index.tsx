import { Redirect } from 'expo-router';
import { useAuth } from '../auth';

export default function Index() {
  const { token, user } = useAuth();
  if (!token) return <Redirect href="/login" />;
  return <Redirect href={user?.isAdmin ? '/admin' : '/user'} />;
}
