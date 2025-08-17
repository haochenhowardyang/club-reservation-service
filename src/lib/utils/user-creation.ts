import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { users as authUsers } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

interface CreateUserOptions {
  email: string;
  name?: string;
  phone?: string;
  image?: string;
  role?: 'user' | 'admin';
}

export async function createUserFromWhitelist(options: CreateUserOptions): Promise<{ success: boolean; userId?: string; message: string }> {
  const { email, name, phone, image, role = 'user' } = options;
  
  try {
    console.log(`[USER_CREATION] Creating user for email: ${email} (main table only)`);
    
    // Check if user already exists in main users table
    const existingMainUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (existingMainUser.length > 0) {
      console.log(`[USER_CREATION] User already exists in main users table: ${email}`);
      return {
        success: true,
        userId: existingMainUser[0].id,
        message: "User already exists"
      };
    }
    
    // Generate unique user ID
    const userId = randomUUID();
    const currentTime = new Date();
    
    console.log(`[USER_CREATION] Generated user ID: ${userId} for ${email}`);
    
    // Create user ONLY in main users table - let NextAuth handle auth tables on sign-in
    // Leave name null if not explicitly provided - will be filled from Google OAuth on first login
    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      name: name || null, // Use provided name or null (no email prefix fallback)
      image: image || null,
      phone: phone || null,
      role,
      strikes: 0,
      isActive: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    });
    
    console.log(`[USER_CREATION] ✅ Created user in main users table only: ${email} with ID: ${userId}`);
    console.log(`[USER_CREATION] NextAuth will handle auth tables when user signs in with OAuth`);
    
    return {
      success: true,
      userId,
      message: "User created successfully in main table"
    };
    
  } catch (error) {
    console.error(`[USER_CREATION] ❌ Error creating user for ${email}:`, error);
    
    // If it's a unique constraint error, try to find existing user
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      console.log(`[USER_CREATION] UNIQUE constraint error - checking for existing user`);
      
      const existingMainUserRetry = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (existingMainUserRetry.length > 0) {
        return {
          success: true,
          userId: existingMainUserRetry[0].id,
          message: "User already exists (found after constraint error)"
        };
      }
    }
    
    return {
      success: false,
      message: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
  try {
    // First try main users table
    const mainUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (mainUserResult.length > 0) {
      return {
        id: mainUserResult[0].id,
        email: mainUserResult[0].email,
        name: mainUserResult[0].name,
      };
    }
    
    // Then try auth users table
    const authUserResult = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email.toLowerCase()))
      .limit(1);
    
    if (authUserResult.length > 0) {
      return {
        id: authUserResult[0].id,
        email: authUserResult[0].email,
        name: authUserResult[0].name,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding user by email ${email}:`, error);
    return null;
  }
}
