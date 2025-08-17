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
      console.log(`[AUTH] OAuth user sign-in: ${user.email} (NextAuth ID: ${user.id})`);
      
      // Import the main users table
      const { users: mainUsers } = await import('./db/schema');
      
      try {
        // Check if user already exists in main users table (pre-created from whitelist)
        console.log(`[AUTH] Checking for existing user in main users table...`);
        const existingMainUser = await db
          .select()
          .from(mainUsers)
          .where(eq(mainUsers.email, user.email!.toLowerCase()))
          .limit(1);
        
        if (existingMainUser.length > 0) {
          console.log(`[AUTH] 🔄 Found existing user in main table: ${user.email}`);
          console.log(`[AUTH] Existing main table ID: ${existingMainUser[0].id}, NextAuth ID: ${user.id}`);
          
          // Update main table to use NextAuth ID for consistency
          console.log(`[AUTH] 🔧 Updating main table user to use NextAuth ID`);
          
          const oldId = existingMainUser[0].id;
          
          await db
            .update(mainUsers)
            .set({ 
              id: user.id, // Use the NextAuth ID
              image: user.image || existingMainUser[0].image, // Update image from Google if available
              updatedAt: new Date()
            })
            .where(eq(mainUsers.id, oldId));
          
          // Update auth table with additional info from main table
          await db
            .update(authUsers)
            .set({
              phone: existingMainUser[0].phone,
              role: existingMainUser[0].role,
              strikes: existingMainUser[0].strikes,
              isActive: existingMainUser[0].isActive
            })
            .where(eq(authUsers.id, user.id));
          
          console.log(`[AUTH] ✅ Synchronized both tables - using NextAuth ID: ${user.id}`);
          
          // Note: Foreign key references in other tables (like poker players) 
          // will need to be updated if they reference the old ID
          if (oldId !== user.id) {
            console.log(`[AUTH] ⚠️ User ID changed from ${oldId} to ${user.id} - foreign key references may need updating`);
          }
          
          return;
        }
        
        console.log(`[AUTH] No existing user found, creating new user in main table...`);
        
        // Create user in main users table (normal OAuth flow)
        await db.insert(mainUsers).values({
          id: user.id,
          email: user.email!.toLowerCase(),
          name: user.name || user.email!.split('@')[0],
          image: user.image,
          role: user.email === 'haochenhowardyang@gmail.com' ? 'admin' : 'user',
          strikes: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`[AUTH] ✅ Created new user in main users table: ${user.email}`);
        
      } catch (error) {
        console.error(`[AUTH] ❌ Error in createUser event:`, error);
        
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          console.log(`[AUTH] 💡 User already exists (UNIQUE constraint) - this is expected`);
        }
      }

      // Set admin role in auth table if needed
      if (user.email === 'haochenhowardyang@gmail.com') {
        await db
          .update(authUsers)
          .set({ role: 'admin' })
          .where(eq(authUsers.id, user.id));
        console.log(`[AUTH] Set admin role for ${user.email}`);
      }

      // Copy phone number from whitelist if available
      if (user.email) {
        const whitelistEntry = await db
          .select()
          .from(emailWhitelist)
          .where(eq(emailWhitelist.email, user.email.toLowerCase()))
          .limit(1);
        
        if (whitelistEntry.length > 0 && whitelistEntry[0].phone) {
          await db
            .update(authUsers)
            .set({ phone: whitelistEntry[0].phone })
            .where(eq(authUsers.id, user.id));
          console.log(`[AUTH] Copied phone from whitelist for ${user.email}`);
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
          const whitelistEntry = await db
            .select()
            .from(emailWhitelist)
            .where(eq(emailWhitelist.email, user.email.toLowerCase()))
            .limit(1);
          
          if (whitelistEntry.length === 0) {
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
