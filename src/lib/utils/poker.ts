import { db } from '../db';
import { pokerGames, pokerWaitlist, reservations } from '../db/schema';
import { eq, and, asc, desc, lt, gte, gt, or } from 'drizzle-orm';
import { isWithinBookingWindow, isReservationInPast } from './time';
import { sendPromotionNotification } from './notifications';
import { ensureUserExists } from './users';
import { addPokerPlayer, incrementWaitlistJoins, isPokerPlayer } from './poker-players';

/**
 * Create a new poker game (admin only)
 */
export async function createPokerGame(
  date: string,
  startTime: string,
  blindLevel: string,
  notes?: string
): Promise<number | null> {
  console.log(`createPokerGame called with: date=${date}, startTime=${startTime}, blindLevel=${blindLevel}`);
  
  // Check if date is within booking window
  if (!isWithinBookingWindow(date)) {
    console.log(`Poker game creation rejected: Date ${date} is outside the 2-week booking window`);
    return null;
  }
  
  // Check if game is in the past
  if (isReservationInPast(date, startTime)) {
    console.log(`Poker game creation rejected: Date ${date} ${startTime} is in the past`);
    return null;
  }
  
  // Create the poker game
  console.log(`Inserting poker game into database with date: ${date}`);
  const gameData = {
    date,
    startTime,
    endTime: null, // Poker games don't have a set end time
    blindLevel,
    status: 'open' as const,
    notes: notes || null,
  };
  console.log(`Game data to insert:`, gameData);
  
  const result = await db.insert(pokerGames).values(gameData);
  
  const gameId = Number(result.lastInsertRowid);
  console.log(`Poker game created successfully with ID: ${gameId}`);
  
  return gameId;
}

/**
 * Get all poker games
 */
export async function getAllPokerGames() {
  return db.query.pokerGames.findMany({
    orderBy: [desc(pokerGames.date), desc(pokerGames.startTime)],
  });
}

/**
 * Get upcoming poker games
 */
export async function getUpcomingPokerGames() {
  const today = new Date().toISOString().split('T')[0];
  
  return db.query.pokerGames.findMany({
    where: and(
      gte(pokerGames.date, today),
      eq(pokerGames.status, 'open')
    ),
    orderBy: [asc(pokerGames.date), asc(pokerGames.startTime)],
  });
}

/**
 * Get a specific poker game
 */
export async function getPokerGame(gameId: number) {
  try {
    console.log(`Fetching poker game with ID ${gameId}...`);
    
    // First, check if the game exists
    const gameExists = await db.query.pokerGames.findFirst({
      where: eq(pokerGames.id, gameId),
    });
    
    if (!gameExists) {
      console.log(`Game with ID ${gameId} not found`);
      return null;
    }
    
    console.log(`Game with ID ${gameId} found, fetching with waitlist...`);
    
    // Try to fetch the game with waitlist and user details
    try {
      const game = await db.query.pokerGames.findFirst({
        where: eq(pokerGames.id, gameId),
        with: {
          waitlist: {
            with: {
              user: true,
            },
            orderBy: [asc(pokerWaitlist.position)],
          },
        },
      });
      
      console.log(`Successfully fetched game with waitlist: ${game?.waitlist?.length || 0} entries`);
      return game;
    } catch (relationError) {
      console.error(`Error fetching game with relations: ${relationError}`);
      
      // Fallback: Get the game without relations
      console.log(`Falling back to fetching game without relations...`);
      const gameBasic = await db.query.pokerGames.findFirst({
        where: eq(pokerGames.id, gameId),
      });
      
      // Manually fetch the waitlist
      console.log(`Manually fetching waitlist for game ${gameId}...`);
      const waitlistEntries = await db.query.pokerWaitlist.findMany({
        where: eq(pokerWaitlist.gameId, gameId),
        orderBy: [asc(pokerWaitlist.position)],
      });
      
      // Create a combined result
      const result = {
        ...gameBasic,
        waitlist: waitlistEntries.map(entry => ({
          ...entry,
          // We don't have user details in this fallback approach
          user: { 
            id: entry.userId, 
            name: "User", 
            email: "", 
            phone: null, 
            strikes: 0, 
            isActive: true 
          }
        }))
      };
      
      console.log(`Fallback approach returned game with ${result.waitlist.length} waitlist entries`);
      return result;
    }
  } catch (error) {
    console.error(`Error in getPokerGame for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Join poker game waitlist
 */
export async function joinPokerWaitlist(
  gameId: number,
  userId: string
): Promise<number | null> {
  try {
    // Step 1: Ensure user exists in users table using our robust utility function
    const userExists = await ensureUserExists(userId);
    if (!userExists) {
      console.log(`Cannot join waitlist: User ${userId} does not exist or could not be copied to users table`);
      return null;
    }

    // Step 2: Explicitly check if the game exists (regardless of status)
    const gameExists = await db.query.pokerGames.findFirst({
      where: eq(pokerGames.id, gameId),
    });
    
    if (!gameExists) {
      console.log(`Cannot join waitlist: Game ${gameId} does not exist in the database`);
      return null;
    }
    
    // Step 3: Check if game is open
    if (gameExists.status !== 'open') {
      console.log(`Cannot join waitlist: Game ${gameId} is not open (status: ${gameExists.status})`);
      return null;
    }
  
    // Check if user is already on the waitlist
    const existingEntry = await db.query.pokerWaitlist.findFirst({
      where: and(
        eq(pokerWaitlist.gameId, gameId),
        eq(pokerWaitlist.userId, userId)
      ),
    });
    
    if (existingEntry) {
      console.log(`User ${userId} is already on the waitlist for game ${gameId}`);
      return existingEntry.position;
    }
    
    // Get current position in waitlist
    const waitlistEntries = await db.query.pokerWaitlist.findMany({
      where: eq(pokerWaitlist.gameId, gameId),
    });
    
    const position = waitlistEntries.length + 1;
    
    // Add to waitlist
    const result = await db.insert(pokerWaitlist).values({
      gameId,
      userEmail: userId,
      position,
      status: 'waiting',
    });
    
    // Check if user is already in poker players list, if not add them
    const isAlreadyPokerPlayer = await isPokerPlayer(userId);
    if (!isAlreadyPokerPlayer) {
      await addPokerPlayer(userId, 'auto_waitlist', new Date());
      console.log(`Auto-added user ${userId} to poker players list (first waitlist join)`);
    } else {
      // If they're already a poker player, increment their waitlist join count
      await incrementWaitlistJoins(userId);
    }
    
    return position;
  } catch (error) {
    console.error(`Error joining poker waitlist for game ${gameId}, user ${userId}:`, error);
    return null;
  }
}

/**
 * Leave poker game waitlist
 */
export async function leavePokerWaitlist(
  gameId: number,
  userId: string
): Promise<boolean> {
  // Check if user is on the waitlist
  const entry = await db.query.pokerWaitlist.findFirst({
    where: and(
      eq(pokerWaitlist.gameId, gameId),
      eq(pokerWaitlist.userId, userId)
    ),
  });
  
  if (!entry) {
    return false;
  }
  
  // Remove from waitlist
  await db.delete(pokerWaitlist)
    .where(and(
      eq(pokerWaitlist.gameId, gameId),
      eq(pokerWaitlist.userId, userId)
    ));
  
  // Reorder positions for remaining waitlist entries
  const remainingEntries = await db.query.pokerWaitlist.findMany({
    where: and(
      eq(pokerWaitlist.gameId, gameId),
      gt(pokerWaitlist.position, entry.position)
    ),
    orderBy: [asc(pokerWaitlist.position)],
  });
  
  for (const remainingEntry of remainingEntries) {
    await db.update(pokerWaitlist)
      .set({ position: remainingEntry.position - 1 })
      .where(eq(pokerWaitlist.id, remainingEntry.id));
  }
  
  return true;
}

/**
 * Confirm player from waitlist (admin only)
 */
export async function confirmPokerPlayer(
  gameId: number,
  userEmail: string
): Promise<boolean> {
  // Check if user is on the waitlist
  const entry = await db.query.pokerWaitlist.findFirst({
    where: and(
      eq(pokerWaitlist.gameId, gameId),
      eq(pokerWaitlist.userEmail, userEmail)
    ),
  });
  
  if (!entry) {
    return false;
  }
  
  // Get the game
  const game = await db.query.pokerGames.findFirst({
    where: eq(pokerGames.id, gameId),
  });
  
  if (!game) {
    return false;
  }
  
  // Update waitlist entry status (no player count limits)
  await db.update(pokerWaitlist)
    .set({ status: 'confirmed' })
    .where(eq(pokerWaitlist.id, entry.id));
  
  // Send confirmation notification
  // In a real implementation, you would create a notification record
  console.log(`[NOTIFICATION PLACEHOLDER] Sending poker confirmation to user ${userEmail} for game ${gameId}`);
  
  return true;
}

/**
 * Close poker game (admin only) - replaces cancel functionality
 */
export async function closePokerGame(gameId: number): Promise<boolean> {
  // Get the game details first
  const game = await db.query.pokerGames.findFirst({
    where: eq(pokerGames.id, gameId),
  });
  
  if (!game) {
    console.log(`Cannot close game: Game ${gameId} not found`);
    return false;
  }

  // Update game status to closed
  await db.update(pokerGames)
    .set({ 
      status: 'closed',
      updatedAt: new Date()
    })
    .where(eq(pokerGames.id, gameId));
  
  // Cancel all associated reservations for this poker game
  const cancelledReservations = await db.update(reservations)
    .set({
      status: 'cancelled',
      notes: 'Poker game was closed by admin',
      updatedAt: new Date()
    })
    .where(and(
      eq(reservations.type, 'poker'),
      eq(reservations.date, game.date),
      eq(reservations.startTime, game.startTime),
      eq(reservations.status, 'confirmed')
    ));
  
  console.log(`Closed poker game ${gameId} and cancelled associated reservations`);
  
  // Get all waitlist entries
  const waitlistEntries = await db.query.pokerWaitlist.findMany({
    where: eq(pokerWaitlist.gameId, gameId),
  });
  
  // Send closure notifications
  for (const entry of waitlistEntries) {
    // In a real implementation, you would create notification records
    console.log(`[NOTIFICATION PLACEHOLDER] Sending poker game closure notification to user ${entry.userId} for game ${gameId}`);
  }
  
  return true;
}

/**
 * @deprecated Use closePokerGame instead
 */
export const cancelPokerGame = closePokerGame;

/**
 * Permanently delete poker game (admin only)
 */
export async function deletePokerGame(gameId: number): Promise<boolean> {
  try {
    // Get the game details first to identify associated reservations
    const game = await db.query.pokerGames.findFirst({
      where: eq(pokerGames.id, gameId),
    });
    
    if (!game) {
      console.log(`Cannot delete game: Game ${gameId} not found`);
      return false;
    }

    // Cancel all associated reservations for this poker game
    const cancelledReservations = await db.update(reservations)
      .set({
        status: 'cancelled',
        notes: 'Poker game was deleted by admin',
        updatedAt: new Date()
      })
      .where(and(
        eq(reservations.type, 'poker'),
        eq(reservations.date, game.date),
        eq(reservations.startTime, game.startTime),
        eq(reservations.status, 'confirmed')
      ));

    console.log(`Cancelled ${cancelledReservations.changes || 0} associated reservations for deleted poker game ${gameId}`);
    
    // Delete all waitlist entries for this game
    await db.delete(pokerWaitlist)
      .where(eq(pokerWaitlist.gameId, gameId));
    
    // Then delete the game itself
    const result = await db.delete(pokerGames)
      .where(eq(pokerGames.id, gameId));
    
    console.log(`Permanently deleted poker game ${gameId}, cancelled associated reservations, and deleted waitlist entries`);
    return true;
  } catch (error) {
    console.error(`Error deleting poker game ${gameId}:`, error);
    return false;
  }
}

/**
 * Auto-close games that have passed their start time
 */
export async function autoCloseExpiredGames(): Promise<number> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
  
  // Find games that should be closed (past start time and still open)
  const expiredGames = await db.query.pokerGames.findMany({
    where: and(
      eq(pokerGames.status, 'open'),
      // Games from today that have passed start time, or games from previous days
      or(
        and(
          eq(pokerGames.date, today),
          lt(pokerGames.startTime, currentTime)
        ),
        lt(pokerGames.date, today)
      )
    ),
  });
  
  // Close expired games and cancel their reservations
  for (const game of expiredGames) {
    await db.update(pokerGames)
      .set({ 
        status: 'closed',
        updatedAt: new Date()
      })
      .where(eq(pokerGames.id, game.id));
    
    // Cancel all associated reservations for this expired poker game
    await db.update(reservations)
      .set({
        status: 'cancelled',
        notes: 'Poker game was automatically closed (past start time)',
        updatedAt: new Date()
      })
      .where(and(
        eq(reservations.type, 'poker'),
        eq(reservations.date, game.date),
        eq(reservations.startTime, game.startTime),
        eq(reservations.status, 'confirmed')
      ));
    
    console.log(`Auto-closed expired poker game ${game.id} (${game.date} ${game.startTime}) and cancelled associated reservations`);
  }
  
  return expiredGames.length;
}

/**
 * Get all poker games with auto-close check
 */
export async function getAllPokerGamesWithAutoClose() {
  // First, auto-close expired games
  await autoCloseExpiredGames();
  
  // Then return all games
  return getAllPokerGames();
}

/**
 * Get upcoming poker games with auto-close check
 */
export async function getUpcomingPokerGamesWithAutoClose() {
  // First, auto-close expired games
  await autoCloseExpiredGames();
  
  // Then return upcoming games (only open ones)
  return getUpcomingPokerGames();
}

/**
 * Get poker waitlist status for a user
 * Returns: -1 = not on waitlist, 0 = confirmed, positive number = waiting position
 */
export async function getPokerWaitlistPosition(
  gameId: number,
  userEmail: string
): Promise<number> {
  const entry = await db.query.pokerWaitlist.findFirst({
    where: and(
      eq(pokerWaitlist.gameId, gameId),
      eq(pokerWaitlist.userEmail, userEmail)
    ),
  });
  
  if (!entry) {
    return -1; // Not on waitlist
  }
  
  if (entry.status === 'confirmed') {
    return 0; // Confirmed (special value)
  }
  
  if (entry.status === 'waiting') {
    return entry.position; // Waiting position
  }
  
  return -1; // Declined or other status
}
