import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { autoCloseExpiredGames } from "@/lib/utils/poker";
import { db } from "@/lib/db";
import { pokerGames, pokerWaitlist, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Database from 'better-sqlite3';
import path from 'path';
import { ensureUserExists } from "@/lib/utils/users";
import { addPokerPlayer, incrementWaitlistJoins, isPokerPlayer } from "@/lib/utils/poker-players";

// This is the correct way to handle dynamic route parameters in Next.js App Router
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has too many strikes
    if (session.user.strikes >= 3) {
      return NextResponse.json(
        { message: "Your account has been restricted due to multiple no-shows" },
        { status: 403 }
      );
    }

    // Get the game ID from the URL path directly
    // This avoids the params.id issue completely
    const url = request.url;
    const matches = url.match(/\/api\/poker\/games\/(\d+)\/join/);
    
    if (!matches || !matches[1]) {
      return NextResponse.json(
        { message: "Invalid game ID in URL" },
        { status: 400 }
      );
    }
    
    const gameId = parseInt(matches[1], 10);
    console.log(`Extracted game ID ${gameId} from URL: ${url}`);
    
    // Validate game ID
    if (isNaN(gameId)) {
      return NextResponse.json(
        { message: "Invalid game ID" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    // Validate user ID
    if (userId !== session.user.id) {
      return NextResponse.json(
        { message: "You can only join the waitlist for yourself" },
        { status: 403 }
      );
    }

    // Auto-close expired games before checking game status
    await autoCloseExpiredGames();
    
    // Verify the game exists before attempting to join
    console.log(`Verifying if game ${gameId} exists in database...`);
    const game = await db.query.pokerGames.findFirst({
      where: eq(pokerGames.id, gameId),
    });
    
    if (!game) {
      console.error(`Game with ID ${gameId} not found in database`);
      return NextResponse.json(
        { message: `Game with ID ${gameId} does not exist` },
        { status: 404 }
      );
    }
    
    console.log(`Game with ID ${gameId} found, status: ${game.status}`);

    if (game.status !== 'open') {
      console.error(`Game with ID ${gameId} is not open (status: ${game.status})`);
      return NextResponse.json(
        { message: `Game is not available for joining (status: ${game.status})` },
        { status: 400 }
      );
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
      return NextResponse.json({ position: existingEntry.position });
    }
    
    // CRITICAL: Ensure the user exists in the users table before proceeding
    console.log(`Ensuring user ${userId} exists in users table before adding to waitlist...`);
    const userExists = await ensureUserExists(userId);
    
    if (!userExists) {
      console.error(`Failed to ensure user ${userId} exists in users table`);
      
      // Open a direct connection to the database for detailed diagnostics
      const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';
      const sqlite = new Database(dbPath);
      
      try {
        // Check both tables to provide detailed error information
        const userInUserTable = sqlite.prepare('SELECT 1 FROM user WHERE id = ?').get(userId);
        const userInUsersTable = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
        
        console.log(`Diagnostic check - User in NextAuth 'user' table: ${!!userInUserTable}, User in app 'users' table: ${!!userInUsersTable}`);
        
        if (!userInUserTable) {
          return NextResponse.json(
            { message: "User not found in authentication system. Please try logging out and back in." },
            { status: 401 }
          );
        } else {
          return NextResponse.json(
            { message: "User synchronization failed. Please try again or contact support." },
            { status: 500 }
          );
        }
      } finally {
        sqlite.close();
      }
    }
    
    // Double-check that the user now exists in the users table using direct SQL
    // This is more reliable than using the ORM
    const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';
    const sqlite = new Database(dbPath);
    
    try {
      const userInDb = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
      
      if (!userInDb) {
        console.error(`User ${userId} still not found in users table after synchronization attempt (direct SQL check)`);
        return NextResponse.json(
          { message: "User synchronization verification failed. Please try again later." },
          { status: 500 }
        );
      }
      
      console.log(`User ${userId} confirmed in users table (direct SQL check), proceeding with waitlist addition`);
    } finally {
      sqlite.close();
    }
    
    // Get current position in waitlist
    const waitlistEntries = await db.query.pokerWaitlist.findMany({
      where: eq(pokerWaitlist.gameId, gameId),
    });
    
    const position = waitlistEntries.length + 1;
    
    // Add to waitlist directly
    try {
      console.log(`Adding user ${userId} to waitlist for game ${gameId} at position ${position}`);
      
      // First attempt: Use the ORM with the correct property names
      try {
        console.log(`Attempting to insert with ORM...`);
        
        // Use the correct property names for the ORM
        const result = await db.insert(pokerWaitlist).values({
          gameId,  // ORM maps this to game_id in the database
          userId,  // ORM maps this to user_id in the database
          position,
          status: 'waiting',
        });
        
        console.log(`Successfully added user to waitlist, result:`, result);
        
        // Auto-add user to poker players list if not already there
        try {
          const isAlreadyPokerPlayer = await isPokerPlayer(userId);
          
          if (!isAlreadyPokerPlayer) {
            console.log(`Adding user ${userId} to poker players list (first-time waitlist join)`);
            const addedToPlayers = await addPokerPlayer(userId, 'auto_waitlist', new Date());
            
            if (addedToPlayers) {
              console.log(`Successfully added user ${userId} to poker players list`);
            } else {
              console.warn(`Failed to add user ${userId} to poker players list, but waitlist join succeeded`);
            }
          } else {
            console.log(`User ${userId} is already a poker player, incrementing waitlist join count`);
            const incremented = await incrementWaitlistJoins(userId);
            
            if (incremented) {
              console.log(`Successfully incremented waitlist joins for user ${userId}`);
            } else {
              console.warn(`Failed to increment waitlist joins for user ${userId}, but waitlist join succeeded`);
            }
          }
        } catch (playerError) {
          // Don't fail the waitlist join if poker player operations fail
          console.error(`Error managing poker player status for user ${userId}:`, playerError);
        }
        
        return NextResponse.json({ position });
      } catch (ormError) {
        console.error(`ORM insert failed:`, ormError);
        
        // Second attempt: Try direct SQL as a fallback
        console.log(`Falling back to direct SQL query...`);
        
        const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';
        const sqlite = new Database(dbPath);
        
        try {
          // Enable foreign keys
          sqlite.pragma('foreign_keys = ON');
          
          // Log the values we're trying to insert for debugging
          console.log(`Inserting values: game_id=${gameId}, user_id=${userId}, position=${position}`);
          
          // Use direct SQL to insert the record
          const stmt = sqlite.prepare(`
            INSERT INTO poker_waitlist (game_id, user_id, position, status, created_at, updated_at)
            VALUES (?, ?, ?, 'waiting', ?, ?)
          `);
          
          const now = Date.now();
          const result = stmt.run(gameId, userId, position, now, now);
          
          console.log(`Direct SQL insert successful:`, result);
          
          // Auto-add user to poker players list if not already there (SQL fallback path)
          try {
            const isAlreadyPokerPlayer = await isPokerPlayer(userId);
            
            if (!isAlreadyPokerPlayer) {
              console.log(`Adding user ${userId} to poker players list (first-time waitlist join - SQL fallback)`);
              const addedToPlayers = await addPokerPlayer(userId, 'auto_waitlist', new Date());
              
              if (addedToPlayers) {
                console.log(`Successfully added user ${userId} to poker players list`);
              } else {
                console.warn(`Failed to add user ${userId} to poker players list, but waitlist join succeeded`);
              }
            } else {
              console.log(`User ${userId} is already a poker player, incrementing waitlist join count`);
              const incremented = await incrementWaitlistJoins(userId);
              
              if (incremented) {
                console.log(`Successfully incremented waitlist joins for user ${userId}`);
              } else {
                console.warn(`Failed to increment waitlist joins for user ${userId}, but waitlist join succeeded`);
              }
            }
          } catch (playerError) {
            // Don't fail the waitlist join if poker player operations fail
            console.error(`Error managing poker player status for user ${userId}:`, playerError);
          }
          
          return NextResponse.json({ position });
        } catch (sqlError) {
          console.error(`Direct SQL insert failed:`, sqlError);
          throw sqlError; // Re-throw to be caught by the outer catch block
        } finally {
          sqlite.close();
        }
      }
    } catch (error) {
      console.error(`Error adding user to waitlist:`, error);
      
      // Check if it's a foreign key constraint error
      if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
        // Try to determine which constraint failed
        console.log(`Foreign key constraint failed. Checking database structure...`);
        
        // Open a direct connection to the database for debugging
        const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';
        const sqlite = new Database(dbPath);
        
        try {
          // Check the structure of the poker_waitlist table
          const tableInfo = sqlite.prepare('PRAGMA table_info(poker_waitlist)').all();
          console.log(`Poker waitlist table structure:`, tableInfo);
          
          // Check foreign key constraints
          const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(poker_waitlist)').all();
          console.log(`Poker waitlist foreign keys:`, foreignKeys);
          
          // Check if the user and game actually exist in their respective tables
          const userExists = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
          const gameExists = sqlite.prepare('SELECT 1 FROM poker_games WHERE id = ?').get(gameId);
          
          console.log(`Direct DB check - User exists: ${!!userExists}, Game exists: ${!!gameExists}`);
          
          if (!userExists) {
            return NextResponse.json(
              { message: "User not found in database. Please try logging out and back in." },
              { status: 400 }
            );
          }
          
          if (!gameExists) {
            return NextResponse.json(
              { message: "Game not found in database. It may have been cancelled." },
              { status: 400 }
            );
          }
          
          return NextResponse.json(
            { message: "Database constraint error. Please contact support with error code: FK-PW-001" },
            { status: 400 }
          );
        } finally {
          sqlite.close();
        }
      }
      
      return NextResponse.json(
        { message: "Failed to join waitlist. Please try again later." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error joining poker waitlist:", error);
    
    return NextResponse.json(
      { message: "An error occurred while joining the waitlist" },
      { status: 500 }
    );
  }
}
