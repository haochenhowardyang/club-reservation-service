import { formatChineseDateTimeForSMS } from '../utils/time';

export interface SMSMessage {
  to: string;
  message: string;
}


/**
 * Format phone number for Twilio (ensure proper format)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code, ensure it starts with +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume it's a US number and add +1
  return `+1${digits}`;
}

/**
 * Generate SMS message templates
 */
export const SMSTemplates = {
  pokerConfirmation: (gameDetails: {
    date: string;
    startTime: string;
    blindLevel: string;
    confirmationLink: string;
  }) => {
    const chineseDateTimeFormatted = formatChineseDateTimeForSMS(gameDetails.date, gameDetails.startTime);

    return `🎰 恭喜您已被邀请加入德州扑克牌局

📅 日期：${chineseDateTimeFormatted}
💰 盲注：${gameDetails.blindLevel}

请在四小时内接受或拒绝邀请:
${gameDetails.confirmationLink}`;
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
