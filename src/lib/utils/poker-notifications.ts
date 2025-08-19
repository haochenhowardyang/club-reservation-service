import { db } from '../db';
import { notifications, pokerGames, users, smsQueue, pokerWaitlist, reservations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { SMSTemplates } from '../services/sms';
import { generateConfirmationToken, generateExpiryTimestamp, generateConfirmationUrl } from './tokens';

/**
 * Send SMS confirmation to a poker player
 */
export async function sendPokerConfirmationSMS(
  gameId: number,
  userEmail: string
): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Get game details
    const gameResult = await db
      .select()
      .from(pokerGames)
      .where(eq(pokerGames.id, gameId))
      .limit(1);
    
    const game = gameResult[0];

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Get user details (including phone number) using email-based schema
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    const user = userResult[0];

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.phone) {
      return { success: false, error: 'User has no phone number' };
    }

    // Check if we've already sent a confirmation for this game/user using email-based fields
    const existingNotificationResult = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.pokerGameId, gameId),
        eq(notifications.userEmail, userEmail),
        eq(notifications.type, 'poker_confirmation')
      ))
      .limit(1);
    
    const existingNotification = existingNotificationResult[0];

    if (existingNotification) {
      return { success: false, error: 'Confirmation already sent' };
    }

    // Generate confirmation token and expiry
    const confirmationToken = generateConfirmationToken();
    const expiresAt = generateExpiryTimestamp();
    const confirmationUrl = generateConfirmationUrl(confirmationToken);

    // Create notification record using email-based schema
    const notificationResult = await db.insert(notifications).values({
      userEmail,
      pokerGameId: gameId,
      type: 'poker_confirmation',
      method: 'sms',
      status: 'pending',
      confirmationToken,
      expiresAt,
    });

    const notificationId = Number(notificationResult.lastInsertRowid);

    // Generate SMS messages - split into two separate messages for better link clickability
    console.log(`[POKER_SMS] Game data for SMS:`, {
      id: game.id,
      date: game.date,
      startTime: game.startTime,
      blindLevel: game.blindLevel,
      notes: game.notes,
      notesType: typeof game.notes,
      notesLength: game.notes?.length
    });

    const infoMessage = SMSTemplates.pokerConfirmation({
      date: game.date,
      startTime: game.startTime,
      blindLevel: game.blindLevel || 'TBD',
      notes: game.notes || undefined,
    });

    const linkMessage = SMSTemplates.pokerConfirmationLink(confirmationUrl);

    console.log(`[POKER_SMS] Generated info message:`, infoMessage);
    console.log(`[POKER_SMS] Generated link message:`, linkMessage);

    // Add both messages to SMS queue for Mac script to process
    // First message: Game info
    await db.insert(smsQueue).values({
      phoneNumber: user.phone,
      message: infoMessage,
      notificationId,
      status: 'pending',
    });

    // Second message: Just the link (sent after a slight delay)
    await db.insert(smsQueue).values({
      phoneNumber: user.phone,
      message: linkMessage,
      notificationId,
      status: 'pending',
    });

    return { success: true, notificationId };
  } catch (error) {
    console.error('Error sending poker confirmation SMS:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get confirmation status for a poker game and user
 */
export async function getPokerConfirmationStatus(
  gameId: number,
  userEmail: string
): Promise<{
  hasPendingConfirmation: boolean;
  status?: 'pending' | 'sent' | 'confirmed' | 'declined' | 'expired' | 'failed';
  expiresAt?: Date;
  notificationId?: number;
}> {
  const notificationResult = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.pokerGameId, gameId),
      eq(notifications.userEmail, userEmail),
      eq(notifications.type, 'poker_confirmation')
    ))
    .limit(1);
  
  const notification = notificationResult[0];

  if (!notification) {
    return { hasPendingConfirmation: false };
  }

  return {
    hasPendingConfirmation: true,
    status: notification.status as any,
    expiresAt: notification.expiresAt || undefined,
    notificationId: notification.id,
  };
}

/**
 * Handle confirmation response (accept/decline)
 */
export async function handlePokerConfirmationResponse(
  token: string,
  response: 'confirmed' | 'declined'
): Promise<{ success: boolean; gameId?: number; userId?: string; error?: string }> {
  try {
    // Find notification by token
    const notificationResult = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.confirmationToken, token),
        eq(notifications.type, 'poker_confirmation')
      ))
      .limit(1);
    
    const notification = notificationResult[0];

    if (!notification) {
      return { success: false, error: 'Invalid confirmation token' };
    }

    // Check if token has expired
    if (notification.expiresAt && new Date() > notification.expiresAt) {
      // Update status to expired
      await db.update(notifications)
        .set({ status: 'expired' })
        .where(eq(notifications.id, notification.id));

      return { success: false, error: 'Confirmation link has expired' };
    }

    // Check if already responded
    if (notification.status === 'confirmed' || notification.status === 'declined') {
      return { success: false, error: 'You have already responded to this confirmation' };
    }

    const gameId = notification.pokerGameId;
    const userEmail = notification.userEmail;

    if (!gameId) {
      return { success: false, error: 'Invalid game ID in notification' };
    }

    try {
      // Update notification status (notifications table supports 'confirmed'/'declined')
      console.log(`Updating notification ${notification.id} status to ${response}`);
      await db.update(notifications)
        .set({ status: response })
        .where(eq(notifications.id, notification.id));
      console.log(`Successfully updated notification status`);
    } catch (notificationError) {
      console.error(`Error updating notification status:`, notificationError);
      throw notificationError;
    }

    // Find and update the corresponding waitlist entry using email-based schema
    const waitlistEntryResult = await db
      .select()
      .from(pokerWaitlist)
      .where(and(
        eq(pokerWaitlist.gameId, gameId),
        eq(pokerWaitlist.userEmail, userEmail)
      ))
      .limit(1);
    
    const waitlistEntry = waitlistEntryResult[0];

    if (waitlistEntry) {
      try {
        // Update waitlist entry status to match the confirmation response
        // (pokerWaitlist table supports 'confirmed'/'declined')
        const waitlistStatus = response === 'confirmed' ? 'confirmed' : 'declined';
        console.log(`Updating waitlist entry ${waitlistEntry.id} status to ${waitlistStatus}`);
        await db.update(pokerWaitlist)
          .set({ status: waitlistStatus as 'confirmed' | 'declined' })
          .where(eq(pokerWaitlist.id, waitlistEntry.id));
        console.log(`Successfully updated waitlist entry status`);
      } catch (waitlistError) {
        console.error(`Error updating waitlist status:`, waitlistError);
        throw waitlistError;
      }

      // If confirmed, increment the game's current player count and create reservation
      if (response === 'confirmed') {
        // Get current player count and increment it
        const currentGameResult = await db
          .select()
          .from(pokerGames)
          .where(eq(pokerGames.id, gameId))
          .limit(1);
        
        const currentGame = currentGameResult[0];
        
        if (currentGame) {

          // Check if a reservation already exists for this user and game to prevent duplicates
          const existingReservationResult = await db
            .select()
            .from(reservations)
            .where(and(
              eq(reservations.userEmail, notification.userEmail),
              eq(reservations.type, 'poker'),
              eq(reservations.date, currentGame.date),
              eq(reservations.startTime, currentGame.startTime),
              eq(reservations.status, 'confirmed')
            ))
            .limit(1);
          
          const existingReservation = existingReservationResult[0];

          // Only create reservation if one doesn't already exist
          if (!existingReservation) {
            await db.insert(reservations).values({
              userEmail: notification.userEmail, // Use email from notification for email-based schema
              type: 'poker',
              date: currentGame.date,
              startTime: currentGame.startTime,
              endTime: currentGame.startTime, // Poker games don't have endTime in the schema, use startTime
              partySize: 1, // Poker is always 1 person per reservation
              status: 'confirmed',
              notes: `德州扑克 - 短信确认参加`,
            });
          }
        }
      }
    }

    return { 
      success: true, 
      gameId,
      userId: userEmail 
    };
  } catch (error) {
    console.error('Error handling poker confirmation response:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get confirmation details by token
 */
export async function getConfirmationDetails(token: string): Promise<{
  success: boolean;
  game?: any;
  user?: any;
  notification?: any;
  error?: string;
}> {
  try {
    // Find notification by token
    const notificationResult = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.confirmationToken, token),
        eq(notifications.type, 'poker_confirmation')
      ))
      .limit(1);
    
    const notification = notificationResult[0];

    if (!notification) {
      return { success: false, error: 'Invalid confirmation token' };
    }

    // Get game details
    let game = null;
    if (notification.pokerGameId) {
      const gameResult = await db
        .select()
        .from(pokerGames)
        .where(eq(pokerGames.id, notification.pokerGameId))
        .limit(1);
      
      game = gameResult[0];
    }

    // Get user details using email-based schema
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, notification.userEmail))
      .limit(1);
    
    const user = userResult[0];

    if (!game || !user) {
      return { success: false, error: 'Game or user not found' };
    }

    return {
      success: true,
      game,
      user,
      notification,
    };
  } catch (error) {
    console.error('Error getting confirmation details:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Clean up expired confirmations (can be run as a scheduled job)
 */
export async function cleanupExpiredConfirmations(): Promise<void> {
  try {
    const now = new Date();
    
    // Update expired confirmations
    await db.update(notifications)
      .set({ status: 'expired' })
      .where(and(
        eq(notifications.type, 'poker_confirmation'),
        eq(notifications.status, 'sent')
      ));

    console.log('Cleaned up expired poker confirmations');
  } catch (error) {
    console.error('Error cleaning up expired confirmations:', error);
  }
}
