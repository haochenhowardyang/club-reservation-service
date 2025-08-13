import { db } from '@/lib/db';
import { emailWhitelist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user's email is in the whitelist
 * @param email The user's email address
 * @returns A promise that resolves to true if the user is in the whitelist, false otherwise
 */
export async function isUserWhitelisted(email: string): Promise<boolean> {
  if (!email) return false;
  
  const whitelistedEmail = await db
    .select()
    .from(emailWhitelist)
    .where(eq(emailWhitelist.email, email))
    .limit(1);

  return whitelistedEmail.length > 0;
}

/**
 * Check if a user's email is an admin email
 * @param email The user's email address
 * @returns A promise that resolves to true if the user is an admin, false otherwise
 */
export async function isUserAdmin(email: string): Promise<boolean> {
  // For now, we're hardcoding the admin email
  // In a real application, you would check a database field or role
  return email === 'haochenhowardyang@gmail.com';
}
