import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { emailWhitelist } from './db/schema';
import { users as authUsers } from './db/auth-schema';
import { eq } from 'drizzle-orm';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Fix for OAuthAccountNotLinked error
  // @ts-ignore - This property exists but is not in the type definition
  allowDangerousEmailAccountLinking: true,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  events: {
    async createUser({ user }) {
      console.log(`[AUTH] 🔥 createUser EVENT TRIGGERED`);
      console.log(`[AUTH] Creating user in main users table: ${user.email} (ID: ${user.id})`);
      console.log(`[AUTH] User object:`, JSON.stringify(user, null, 2));
      
      // Import the main users table
      const { users: mainUsers } = await import('./db/schema');
      
      try {
        // First check if user already exists in main users table
        console.log(`[AUTH] Checking if user already exists in main users table...`);
        const existingUser = await db.query.users.findFirst({
          where: (mainUsers, { eq }) => eq(mainUsers.email, user.email!),
        });
        
        if (existingUser) {
          console.log(`[AUTH] ⚠️  User already exists in main users table: ${user.email}`);
          console.log(`[AUTH] Existing user ID: ${existingUser.id}, New user ID: ${user.id}`);
          
          // If the IDs are different, we might need to update the existing record
          if (existingUser.id !== user.id) {
            console.log(`[AUTH] 🔄 User IDs don't match - this might cause session issues`);
            console.log(`[AUTH] Consider updating the existing user record or handling ID mismatch`);
          }
          
          return; // Skip creation since user already exists
        }
        
        console.log(`[AUTH] User not found in main users table, creating new user...`);
        console.log(`[AUTH] Attempting to insert user into main users table...`);
        
        // Create user in main users table
        const insertResult = await db.insert(mainUsers).values({
          id: user.id,
          email: user.email!,
          name: user.name || user.email!.split('@')[0],
          image: user.image,
          role: user.email === 'haochenhowardyang@gmail.com' ? 'admin' : 'user',
          strikes: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`[AUTH] ✅ Successfully created user in main users table: ${user.email}`);
        console.log(`[AUTH] Insert result:`, insertResult);
        
        // Verify the user was created
        const verifyUser = await db.query.users.findFirst({
          where: (mainUsers, { eq }) => eq(mainUsers.id, user.id),
        });
        console.log(`[AUTH] Verification check:`, verifyUser ? 'USER_FOUND' : 'USER_NOT_FOUND');
        
      } catch (error) {
        console.error(`[AUTH] ❌ CRITICAL ERROR creating user in main users table:`, error);
        console.error(`[AUTH] Error details:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        
        // If it's a unique constraint error, that's actually okay - user already exists
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          console.log(`[AUTH] 💡 User already exists (UNIQUE constraint) - this is expected behavior`);
        }
      }

      // If the email is haochenhowardyang@gmail.com, set role to admin in auth table too
      if (user.email === 'haochenhowardyang@gmail.com') {
        await db
          .update(authUsers)
          .set({ role: 'admin' })
          .where(eq(authUsers.id, user.id));
        console.log(`Set new user ${user.email} as admin in auth table`);
      }

      // Check if user email is in whitelist
      if (user.email) {
        const whitelistEntry = await db.query.emailWhitelist.findFirst({
          where: eq(emailWhitelist.email, user.email.toLowerCase()),
        });
        
        // If found and has phone number, copy phone number from whitelist to user
        if (whitelistEntry?.phone) {
          await db
            .update(authUsers)
            .set({ phone: whitelistEntry.phone })
            .where(eq(authUsers.id, user.id));
          console.log(`Copied phone number from whitelist for ${user.email}`);
          
          // Also update main users table
          try {
            const { users: mainUsers } = await import('./db/schema');
            await db
              .update(mainUsers)
              .set({ phone: whitelistEntry.phone })
              .where(eq(mainUsers.id, user.id));
            console.log(`Copied phone number to main users table for ${user.email}`);
          } catch (error) {
            console.error(`Error updating phone in main users table:`, error);
          }
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log(`[AUTH] 🔥 signIn CALLBACK TRIGGERED`);
      console.log(`[AUTH] Account provider:`, account?.provider);
      console.log(`[AUTH] User data:`, JSON.stringify(user, null, 2));
      
      // Check if user email is whitelisted before allowing sign-in
      if (user.email) {
        console.log(`[AUTH] 🔍 Checking if ${user.email} is whitelisted...`);
        
        try {
          const whitelistEntry = await db.query.emailWhitelist.findFirst({
            where: eq(emailWhitelist.email, user.email.toLowerCase()),
          });
          
          if (!whitelistEntry) {
            console.log(`[AUTH] ❌ User ${user.email} is NOT whitelisted - blocking sign-in`);
            return false; // Block sign-in for non-whitelisted users
          }
          
          console.log(`[AUTH] ✅ User ${user.email} is whitelisted - allowing sign-in`);
        } catch (error) {
          console.error(`[AUTH] Error checking whitelist:`, error);
          return false; // Block sign-in on error
        }
      } else {
        console.log(`[AUTH] ❌ No email provided - blocking sign-in`);
        return false;
      }
      
      console.log(`[AUTH] ✅ Sign-in approved for ${user.email} - createUser event should handle user creation`);
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        // Get user role and other info from database
        const dbUser = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, user.id))
          .limit(1);

        if (dbUser.length > 0) {
          session.user.id = user.id;
          session.user.role = dbUser[0].role;
          session.user.strikes = dbUser[0].strikes;
          session.user.isActive = dbUser[0].isActive;
          session.user.phone = dbUser[0].phone || null;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Add user ID and role to the token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
      }
      return token;
    },
  },
};
