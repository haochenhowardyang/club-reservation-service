import { db } from '../db';
import { gameNotificationTokens, pokerPlayers, users, smsQueue, notifications, pokerWaitlist, pokerGames } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { formatChineseDateTimeForSMS } from './time';

/**
 * Generate a short token for game notifications
 * Using 4 bytes (8 hex characters) for shorter URLs
 */
export function generateGameNotificationToken(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Generate expiry timestamp (set to game date/time for reference)
 */
export function generateGameNotificationExpiry(gameDate: string, gameStartTime: string): Date {
  // Set expiry to the game date/time for reference, but we'll validate based on game status
  const gameDateTime = new Date(`${gameDate}T${gameStartTime}`);
  return gameDateTime;
}

/**
 * Generate unique waitlist join URL
 */
export function generateWaitlistJoinUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/poker/join/${token}`;
}

/**
 * Create notification tokens for selected players
 */
export async function createGameNotificationTokens(
  gameId: number,
  userIds: string[],
  gameDate: string,
  gameStartTime: string
): Promise<{ userId: string; token: string; joinUrl: string }[]> {
  const results = [];
  const expiresAt = generateGameNotificationExpiry(gameDate, gameStartTime);

  for (const userId of userIds) {
    const token = generateGameNotificationToken();
    const joinUrl = generateWaitlistJoinUrl(token);

    // Create token record
    await db.insert(gameNotificationTokens).values({
      token,
      gameId,
      userId,
      type: 'game_notification',
      status: 'pending',
      expiresAt,
    });

    results.push({ userId, token, joinUrl });
  }

  return results;
}

/**
 * Send game notifications to selected players
 */
export async function sendGameNotifications(
  gameId: number,
  userIds: string[],
  customMessage?: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  try {
    const errors: string[] = [];
    let sentCount = 0;

    // Get game details
    const game = await db.query.pokerGames.findFirst({
      where: eq(pokerGames.id, gameId),
    });

    if (!game) {
      return { success: false, sentCount: 0, errors: ['Game not found'] };
    }

    // Get poker players with user details
    const playersToNotify = await db.query.pokerPlayers.findMany({
      where: and(
        eq(pokerPlayers.userId, userIds[0]) // This will be updated in a loop
      ),
      with: {
        user: true,
      },
    });

    // Create notification tokens
    const tokenResults = await createGameNotificationTokens(gameId, userIds, game.date, game.startTime);

    // Process each player
    for (const userId of userIds) {
      try {
        // Get player details
        const player = await db.query.pokerPlayers.findFirst({
          where: eq(pokerPlayers.userId, userId),
          with: {
            user: true,
          },
        });

        if (!player || !player.user.phone) {
          errors.push(`Player ${userId} not found or has no phone number`);
          continue;
        }

        // Find the token for this user
        const tokenResult = tokenResults.find(t => t.userId === userId);
        if (!tokenResult) {
          errors.push(`Failed to create token for user ${userId}`);
          continue;
        }

        // Create notification record
        const notification = await db.insert(notifications).values({
          userId,
          pokerGameId: gameId,
          type: 'poker_invitation',
          method: 'sms',
          status: 'pending',
        });

        // Generate SMS messages - split into two separate messages for better link clickability
        const infoMessage = generateGameNotificationSMS({
          playerName: player.user.name,
          date: game.date,
          startTime: game.startTime,
          blindLevel: game.blindLevel || 'TBD',
          joinUrl: tokenResult.joinUrl,
          customMessage,
          notes: game.notes || undefined,
        });

        const linkMessage = tokenResult.joinUrl;

        // Queue both SMS messages
        // First message: Game info
        await db.insert(smsQueue).values({
          phoneNumber: player.user.phone,
          message: infoMessage,
          status: 'pending',
          notificationId: Number(notification.lastInsertRowid),
        });

        // Second message: Just the link
        await db.insert(smsQueue).values({
          phoneNumber: player.user.phone,
          message: linkMessage,
          status: 'pending',
          notificationId: Number(notification.lastInsertRowid),
        });

        sentCount++;
      } catch (error) {
        console.error(`Error processing notification for user ${userId}:`, error);
        errors.push(`Failed to process notification for user ${userId}`);
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      errors,
    };
  } catch (error) {
    console.error('Error sending game notifications:', error);
    return {
      success: false,
      sentCount: 0,
      errors: ['Failed to send notifications'],
    };
  }
}

/**
 * Generate SMS message for game notification
 */
export function generateGameNotificationSMS(params: {
  playerName: string;
  date: string;
  startTime: string;
  blindLevel: string;
  joinUrl: string;
  customMessage?: string;
  notes?: string;
}): string {
  const { playerName, date, startTime, blindLevel, joinUrl, customMessage, notes } = params;

  // Use Chinese date/time formatting
  const chineseDateTimeFormatted = formatChineseDateTimeForSMS(date, startTime);

  let baseMessage = `🎰 最新德州扑克开放Waitlist啦

Hi${playerName ? ' ' + playerName : ''}!

抢先加入Waitlist，Lucky Poker Best Poker！

📅 日期：${chineseDateTimeFormatted}
💰 盲注：${blindLevel}`;

  // Add notes section if notes exist
  if (notes && notes.trim()) {
    baseMessage += `\n📝 备注：${notes.trim()}`;
  }

  const customPart = customMessage ? `\n\n${customMessage}` : '';

  let trailingMessage = `\n\n🔗一键加入Waitlist:`

  return baseMessage + customPart + trailingMessage;
}

/**
 * Validate and get token details
 */
export async function validateGameNotificationToken(token: string) {
  try {
    const tokenRecord = await db.query.gameNotificationTokens.findFirst({
      where: eq(gameNotificationTokens.token, token),
      with: {
        game: true,
        user: true,
      },
    });

    if (!tokenRecord) {
      return { valid: false, error: '无效链接' };
    }

    // Check if already used
    if (tokenRecord.status === 'used') {
      return { valid: false, error: '该链接已被使用' };
    }

    // Check if token is marked as expired
    if (tokenRecord.status === 'expired') {
      return { valid: false, error: '该链接已过期' };
    }

    // Check if the associated game is still open
    if (!tokenRecord.game || tokenRecord.game.status !== 'open') {
      // Mark token as expired since game is closed/deleted
      await db.update(gameNotificationTokens)
        .set({ status: 'expired' })
        .where(eq(gameNotificationTokens.token, token));

      return { valid: false, error: '牌局已满' };
    }

    return {
      valid: true,
      token: tokenRecord,
      game: tokenRecord.game,
      user: tokenRecord.user,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: '验证链接失败' };
  }
}

/**
 * Process token to join waitlist
 */
export async function processTokenToJoinWaitlist(token: string) {
  try {
    const validation = await validateGameNotificationToken(token);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { token: tokenRecord, game, user } = validation;

    if (!game || !user) {
      return { success: false, error: 'Invalid token data' };
    }

    // Check if user is already on waitlist
    const existingEntry = await db.query.pokerWaitlist.findFirst({
      where: and(
        eq(pokerWaitlist.gameId, game.id),
        eq(pokerWaitlist.userId, user.id)
      ),
    });

    if (existingEntry) {
      return { 
        success: false, 
        error: '您已加入这场牌局的Waitlist',
        position: existingEntry.position 
      };
    }

    // Get current waitlist count to determine position
    const waitlistEntries = await db.query.pokerWaitlist.findMany({
      where: eq(pokerWaitlist.gameId, game.id),
    });

    const position = waitlistEntries.length + 1;

    // Add to waitlist
    await db.insert(pokerWaitlist).values({
      gameId: game.id,
      userId: user.id,
      position,
      status: 'waiting',
    });

    // Mark token as used
    await db.update(gameNotificationTokens)
      .set({ 
        status: 'used',
        usedAt: new Date()
      })
      .where(eq(gameNotificationTokens.token, token));

    return {
      success: true,
      position,
      message: `成功加入Waitlist，确定位置后会通知您`
    };
  } catch (error) {
    console.error('加入Waitlist时出现错误:', error);
    return { success: false, error: '加入Waitlist失败' };
  }
}

/**
 * Clean up tokens for closed/deleted games
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    // Get all pending tokens with their associated games
    const pendingTokens = await db.query.gameNotificationTokens.findMany({
      where: eq(gameNotificationTokens.status, 'pending'),
      with: {
        game: true,
      },
    });

    let expiredCount = 0;

    // Check each token's game status
    for (const token of pendingTokens) {
      if (!token.game || token.game.status !== 'open') {
        // Mark token as expired if game is closed or deleted
        await db.update(gameNotificationTokens)
          .set({ status: 'expired' })
          .where(eq(gameNotificationTokens.id, token.id));
        
        expiredCount++;
      }
    }

    console.log(`Marked ${expiredCount} tokens as expired due to closed/deleted games`);
    return expiredCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}

/**
 * Expire all tokens for a specific game (called when game is closed/deleted)
 */
export async function expireTokensForGame(gameId: number): Promise<number> {
  try {
    const result = await db.update(gameNotificationTokens)
      .set({ status: 'expired' })
      .where(and(
        eq(gameNotificationTokens.gameId, gameId),
        eq(gameNotificationTokens.status, 'pending')
      ));

    console.log(`Expired ${result.changes} tokens for game ${gameId}`);
    return result.changes || 0;
  } catch (error) {
    console.error(`Error expiring tokens for game ${gameId}:`, error);
    return 0;
  }
}
