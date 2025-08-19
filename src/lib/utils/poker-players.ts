import { db } from '../db';
import { pokerPlayers, users, smsQueue } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Add a user to the poker players list
 */
export async function addPokerPlayer(
  userEmail: string,
  addedBy: 'admin' | 'auto_waitlist',
  firstWaitlistDate?: Date,
  notes?: string
): Promise<boolean> {
  try {
    // Check if user is already in the poker players list
    const existingPlayer = await db.query.pokerPlayers.findFirst({
      where: eq(pokerPlayers.userEmail, userEmail),
    });

    if (existingPlayer) {
      console.log(`User ${userEmail} is already in the poker players list`);
      return false;
    }

    // Add to poker players list
    await db.insert(pokerPlayers).values({
      userEmail,
      addedBy,
      firstWaitlistDate: firstWaitlistDate || new Date(),
      totalWaitlistJoins: addedBy === 'auto_waitlist' ? 1 : 0,
      totalGamesPlayed: 0,
      marketingOptIn: true,
      notes: notes || null,
    });

    console.log(`Added user ${userEmail} to poker players list (added by: ${addedBy})`);
    return true;
  } catch (error) {
    console.error(`Error adding user ${userEmail} to poker players list:`, error);
    return false;
  }
}

/**
 * Remove a user from the poker players list
 */
export async function removePokerPlayer(userEmail: string): Promise<boolean> {
  try {
    const result = await db.delete(pokerPlayers)
      .where(eq(pokerPlayers.userEmail, userEmail));

    console.log(`Removed user ${userEmail} from poker players list`);
    return true;
  } catch (error) {
    console.error(`Error removing user ${userEmail} from poker players list:`, error);
    return false;
  }
}

/**
 * Get all poker players with user details
 */
export async function getAllPokerPlayers() {
  try {
    return await db.query.pokerPlayers.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(pokerPlayers.createdAt)],
    });
  } catch (error) {
    console.error('Error fetching poker players:', error);
    return [];
  }
}

/**
 * Get poker players who have opted in for marketing
 */
export async function getMarketingOptInPlayers() {
  try {
    return await db.query.pokerPlayers.findMany({
      where: eq(pokerPlayers.marketingOptIn, true),
      with: {
        user: true,
      },
      orderBy: [desc(pokerPlayers.createdAt)],
    });
  } catch (error) {
    console.error('Error fetching marketing opt-in poker players:', error);
    return [];
  }
}

/**
 * Update poker player marketing opt-in status
 */
export async function updateMarketingOptIn(
  userEmail: string,
  optIn: boolean
): Promise<boolean> {
  try {
    await db.update(pokerPlayers)
      .set({ 
        marketingOptIn: optIn,
        updatedAt: new Date()
      })
      .where(eq(pokerPlayers.userEmail, userEmail));

    console.log(`Updated marketing opt-in for user ${userEmail} to ${optIn}`);
    return true;
  } catch (error) {
    console.error(`Error updating marketing opt-in for user ${userEmail}:`, error);
    return false;
  }
}

/**
 * Update poker player notes
 */
export async function updatePokerPlayerNotes(
  userEmail: string,
  notes: string
): Promise<boolean> {
  try {
    await db.update(pokerPlayers)
      .set({ 
        notes,
        updatedAt: new Date()
      })
      .where(eq(pokerPlayers.userEmail, userEmail));

    console.log(`Updated notes for poker player ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`Error updating notes for poker player ${userEmail}:`, error);
    return false;
  }
}

/**
 * Increment waitlist join count for a poker player
 */
export async function incrementWaitlistJoins(userEmail: string): Promise<boolean> {
  try {
    const player = await db.query.pokerPlayers.findFirst({
      where: eq(pokerPlayers.userEmail, userEmail),
    });

    if (player) {
      await db.update(pokerPlayers)
        .set({ 
          totalWaitlistJoins: player.totalWaitlistJoins + 1,
          updatedAt: new Date()
        })
        .where(eq(pokerPlayers.userEmail, userEmail));

      console.log(`Incremented waitlist joins for user ${userEmail}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error incrementing waitlist joins for user ${userEmail}:`, error);
    return false;
  }
}

/**
 * Increment games played count for a poker player
 */
export async function incrementGamesPlayed(userEmail: string): Promise<boolean> {
  try {
    const player = await db.query.pokerPlayers.findFirst({
      where: eq(pokerPlayers.userEmail, userEmail),
    });

    if (player) {
      await db.update(pokerPlayers)
        .set({ 
          totalGamesPlayed: player.totalGamesPlayed + 1,
          updatedAt: new Date()
        })
        .where(eq(pokerPlayers.userEmail, userEmail));

      console.log(`Incremented games played for user ${userEmail}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error incrementing games played for user ${userEmail}:`, error);
    return false;
  }
}

/**
 * Check if a user is in the poker players list
 */
export async function isPokerPlayer(userEmail: string): Promise<boolean> {
  try {
    const player = await db.query.pokerPlayers.findFirst({
      where: eq(pokerPlayers.userEmail, userEmail),
    });

    return !!player;
  } catch (error) {
    console.error(`Error checking if user ${userEmail} is a poker player:`, error);
    return false;
  }
}

/**
 * Send marketing SMS to all opted-in poker players
 */
export async function sendMarketingSMS(message: string): Promise<number> {
  try {
    const optInPlayers = await getMarketingOptInPlayers();
    let sentCount = 0;

    for (const player of optInPlayers) {
      if (player.user.phone) {
        // Add to SMS queue
        await db.insert(smsQueue).values({
          phoneNumber: player.user.phone,
          message,
          status: 'pending',
        });
        sentCount++;
      }
    }

    console.log(`Queued marketing SMS to ${sentCount} poker players`);
    return sentCount;
  } catch (error) {
    console.error('Error sending marketing SMS:', error);
    return 0;
  }
}

/**
 * Send marketing SMS to specific poker players
 */
export async function sendMarketingSMSToPlayers(
  userEmails: string[],
  message: string
): Promise<number> {
  try {
    let sentCount = 0;

    for (const userEmail of userEmails) {
      const player = await db.query.pokerPlayers.findFirst({
        where: and(
          eq(pokerPlayers.userEmail, userEmail),
          eq(pokerPlayers.marketingOptIn, true)
        ),
        with: {
          user: true,
        },
      });

      if (player && player.user.phone) {
        // Add to SMS queue
        await db.insert(smsQueue).values({
          phoneNumber: player.user.phone,
          message,
          status: 'pending',
        });
        sentCount++;
      }
    }

    console.log(`Queued marketing SMS to ${sentCount} specific poker players`);
    return sentCount;
  } catch (error) {
    console.error('Error sending marketing SMS to specific players:', error);
    return 0;
  }
}
