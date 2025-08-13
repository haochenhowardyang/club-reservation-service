import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * Using 8 bytes (16 hex characters) for shorter URLs while maintaining security
 */
export function generateConfirmationToken(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Generate expiry timestamp (4 hours from now)
 */
export function generateExpiryTimestamp(): Date {
  const now = new Date();
  const expiry = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // 4 hours
  return expiry;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Generate confirmation URL
 */
export function generateConfirmationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/poker/confirm/${token}`;
}
