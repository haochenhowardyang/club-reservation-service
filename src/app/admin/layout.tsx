import './admin.css';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminNavBar from '../../components/AdminNavBar';

export const metadata: Metadata = {
  title: 'Admin Portal - 微醺俱乐部',
  description: 'Admin management portal for club reservations',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect('/auth/signin');
  }

  // Redirect non-admins to customer portal
  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="admin-portal">
      <AdminNavBar />
      <main className="admin-main">
        {children}
      </main>
      <footer className="admin-footer">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} 微醺俱乐部 - Admin Portal
        </div>
      </footer>
    </div>
  );
}
