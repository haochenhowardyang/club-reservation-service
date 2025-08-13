import { db } from '../db';
import { emailWhitelist } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Server-side whitelist check for use in page components
 */
export async function isUserWhitelisted(email: string): Promise<boolean> {
  try {
    const whitelistEntry = await db.query.emailWhitelist.findFirst({
      where: eq(emailWhitelist.email, email.toLowerCase()),
    });
    
    return !!whitelistEntry;
  } catch (error) {
    console.error('Error checking server-side whitelist:', error);
    return false;
  }
}
