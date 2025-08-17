import { formatChineseDateTimeForSMS } from '../utils/time';

export interface SMSMessage {
  to: string;
  message: string;
}

/**
 * Generate SMS message templates
 */
export const SMSTemplates = {
  pokerConfirmation: (gameDetails: {
    date: string;
    startTime: string;
    blindLevel: string;
    notes?: string;
  }) => {
    const chineseDateTimeFormatted = formatChineseDateTimeForSMS(gameDetails.date, gameDetails.startTime);

    let message = `🎰 恭喜您已被邀请加入德州扑克牌局

📅 日期：${chineseDateTimeFormatted}
💰 盲注：${gameDetails.blindLevel}`;

    // Add notes section if notes exist
    if (gameDetails.notes && gameDetails.notes.trim()) {
      message += `\n📝 备注：${gameDetails.notes.trim()}`;
    }

    message += `\n\n🔗请在四小时内接受或拒绝邀请：`;

    return message;
  },

  // Separate template for confirmation links
  pokerConfirmationLink: (confirmationLink: string) => {
    return confirmationLink;
  },

  pokerReminder: (gameDetails: {
    date: string;
    startTime: string;
    blindLevel: string;
  }) => {
    const formattedDate = new Date(gameDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = new Date(`2000-01-01T${gameDetails.startTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `🎰 Poker Game Reminder

Don't forget about your confirmed poker game tomorrow:
${formattedDate} at ${formattedTime}
Blind Level: ${gameDetails.blindLevel}

See you at the table!`;
  },

  pokerCancellation: (gameDetails: {
    date: string;
    startTime: string;
    blindLevel: string;
  }) => {
    const formattedDate = new Date(gameDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = new Date(`2000-01-01T${gameDetails.startTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `🎰 Poker Game Cancelled

Unfortunately, the poker game scheduled for ${formattedDate} at ${formattedTime} (Blind Level: ${gameDetails.blindLevel}) has been cancelled.

We apologize for any inconvenience. You'll be notified of future games.`;
  }
};
