import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import ConditionalNavBar from '@/components/ConditionalNavBar';
import { SessionProvider } from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '微醺俱乐部',
  description: 'Book bar, mahjong, and poker reservations',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <SessionProvider session={session}>
          <ConditionalNavBar />
          {/* Full screen for landing page, normal layout for other pages */}
          {!session ? (
            <main className="w-full h-screen">
              {children}
            </main>
          ) : (
            <>
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <footer className="bg-white border-t mt-auto py-4">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                  © {new Date().getFullYear()} 微醺俱乐部
                </div>
              </footer>
            </>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
