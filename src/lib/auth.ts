import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { emailWhitelist } from './db/schema';
import { users as authUsers } from './db/auth-schema';
import { eq } from 'drizzle-orm';

// Create a custom adapter that extends DrizzleAdapter to fix the OAuthAccountNotLinked error
const customAdapter = {
  ...DrizzleAdapter(db),
  createUser: async (userData: any) => {
    console.log('[CUSTOM ADAPTER] Creating user with data:', userData);
    
    // Ensure ID is always set to the email (lowercase)
    if (userData.email) {
      userData.id = userData.email.toLowerCase();
      console.log('[CUSTOM ADAPTER] Set user ID to email:', userData.id);
    }
    
    // Call the original adapter method with our modified data
    return (DrizzleAdapter(db) as any).createUser(userData);
  }
};

export const authOptions: NextAuthOptions = {
  adapter: customAdapter as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Fix for OAuthAccountNotLinked error - both approaches for maximum compatibility
  // @ts-ignore - This property exists but is not in the type definition
  allowDangerousEmailAccountLinking: true,
  // New debug logging for auth issues
  debug: true,
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
          console.log(`[AUTH] Existing main table email: ${existingMainUser[0].email}, NextAuth email: ${user.email}`);
          
          // Update main table to fill in name from Google
          console.log(`[AUTH] 🔧 Updating main table user with Google name`);
          
          const userEmail = existingMainUser[0].email;
          const shouldUpdateName = !existingMainUser[0].name && user.name;
          
          // Only set name if Google provides one or user already has one - no email fallback
          const nameToSet = shouldUpdateName ? user.name! : existingMainUser[0].name;
          
          const updateData: any = {
            image: user.image || existingMainUser[0].image, // Update image from Google if available
            updatedAt: new Date()
          };
          
          // Only set name if it's not null
          if (nameToSet !== null) {
            updateData.name = nameToSet;
          }
          
          await db
            .update(mainUsers)
            .set(updateData)
            .where(eq(mainUsers.email, userEmail));
          
          if (shouldUpdateName) {
            console.log(`[AUTH] 📝 Filled empty name from Google: ${user.name}`);
          } else if (!existingMainUser[0].name) {
            console.log(`[AUTH] 📝 Keeping name as null - no Google name provided`);
          }
          
          // Update auth table with additional info from main table
          const authUpdateData: any = {
            phone: existingMainUser[0].phone,
            role: existingMainUser[0].role,
            strikes: existingMainUser[0].strikes,
            isActive: existingMainUser[0].isActive
          };
          
          // Only set name in auth table if it's not null
          if (nameToSet !== null) {
            authUpdateData.name = nameToSet;
          }
          
          await db
            .update(authUsers)
            .set(authUpdateData)
            .where(eq(authUsers.id, user.email!.toLowerCase()));
          
          console.log(`[AUTH] ✅ Synchronized both tables - using email: ${user.email}`);
          
          return;
        }
        
        console.log(`[AUTH] No existing user found, creating new user in main table...`);
        
        // Create user in main users table (normal OAuth flow)
        await db.insert(mainUsers).values({
          email: user.email!.toLowerCase(),
          name: user.name || null, // Only use Google name, no email fallback
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
          .where(eq(authUsers.id, user.email.toLowerCase()));
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
            .where(eq(authUsers.id, user.email.toLowerCase()));
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
      console.log(`[AUTH] User ID type:`, typeof user.id);
      console.log(`[AUTH] User ID value:`, user.id);
      console.log(`[AUTH] Email equality check:`, user.email === user.email?.toLowerCase());
      
      // Fix for OAuthAccountNotLinked - ensure user.id is always the email
      if (user.email && user.id !== user.email.toLowerCase()) {
        console.log(`[AUTH] ⚠️ ID mismatch detected - attempting to fix...`);
        console.log(`[AUTH] Current ID: ${user.id}, Email: ${user.email.toLowerCase()}`);
        
        try {
          // Check if there's an existing auth user with the email as ID
          const existingAuthUser = await db
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, user.email.toLowerCase()))
            .limit(1);
          
          if (existingAuthUser.length === 0) {
            console.log(`[AUTH] No existing user with email as ID found, will create new one via adapter`);
            // The custom adapter will handle this
          } else {
            console.log(`[AUTH] Found existing user with email as ID, will link accounts`);
          }
          
          // Force ID to be email in user object (might help with adapter)
          user.id = user.email.toLowerCase();
          console.log(`[AUTH] Set user.id to email: ${user.id}`);
        } catch (error) {
          console.error(`[AUTH] Error fixing ID mismatch:`, error);
        }
      }
      
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
      
      // For existing users, check if we need to update their name
      if (user.name) {
        try {
          const { users: mainUsers } = await import('./db/schema');
          
          // Check if user exists in main table but has no name
          const existingUser = await db
            .select()
            .from(mainUsers)
            .where(eq(mainUsers.email, user.email.toLowerCase()))
            .limit(1);
          
          if (existingUser.length > 0 && !existingUser[0].name) {
            console.log(`[AUTH] 🔧 Existing user ${user.email} has no name, updating with Google name: ${user.name}`);
            
            // Update main table with Google name
            await db
              .update(mainUsers)
              .set({ 
                name: user.name,
                updatedAt: new Date()
              })
              .where(eq(mainUsers.email, user.email.toLowerCase()));
            
            // Also update auth table if the user exists there
            const existingAuthUser = await db
              .select()
              .from(authUsers)
              .where(eq(authUsers.id, user.email.toLowerCase()))
              .limit(1);
            
            if (existingAuthUser.length > 0) {
              await db
                .update(authUsers)
                .set({ name: user.name })
                .where(eq(authUsers.id, user.email.toLowerCase()));
            }
            
            console.log(`[AUTH] ✅ Updated name for existing user: ${user.email}`);
          }
        } catch (error) {
          console.error(`[AUTH] Error updating existing user name:`, error);
        }
      }
      
      console.log(`[AUTH] ✅ Sign-in approved for ${user.email} - createUser event should handle user creation`);
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        // Get user role and other info from database (id field contains email)
        const dbUser = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, user.id))
          .limit(1);

        if (dbUser.length > 0) {
          session.user.id = user.id; // Use NextAuth user.id (contains email)
          session.user.role = dbUser[0].role;
          session.user.strikes = dbUser[0].strikes;
          session.user.isActive = dbUser[0].isActive;
          session.user.phone = dbUser[0].phone || null;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Add user ID and role to the token (id contains email value)
      if (user) {
        token.id = user.id; // Use NextAuth user.id (contains email)
        token.role = (user as any).role || 'user';
      }
      return token;
    },
  },
};
