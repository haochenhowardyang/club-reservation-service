import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
      role: 'user' | 'admin';
      strikes: number;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    phone?: string | null;
    role: 'user' | 'admin';
    strikes: number;
    isActive: boolean;
  }
}
