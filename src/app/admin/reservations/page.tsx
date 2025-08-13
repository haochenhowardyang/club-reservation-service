import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReservationManagementContent from './ReservationManagementContent';

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect('/auth/signin');
  }

  // Redirect non-admins to customer portal
  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return <ReservationManagementContent session={session} />;
}
