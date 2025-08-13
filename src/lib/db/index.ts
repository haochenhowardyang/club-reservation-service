import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as authSchema from './auth-schema';

// Get database path from environment variable or fallback to volume path
const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';

// Combine schemas with proper naming to avoid conflicts
// Rename auth schema exports to avoid overwriting main schema
const combinedSchema = {
  ...schema,
  // Rename auth schema exports to avoid conflicts
  authUsers: authSchema.users,
  accounts: authSchema.accounts,
  sessions: authSchema.sessions,
  verificationTokens: authSchema.verificationTokens,
  verificationTokensIndex: authSchema.verificationTokensIndex,
};

// Create database connection with fallback for build time
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle>;

try {
  console.log('📊 Connecting to database:', dbPath);
  _sqlite = new Database(dbPath);
  _db = drizzle(_sqlite, { schema: combinedSchema });
  console.log('✅ Database connection established');
  console.log('📱 SMS notifications handled by Mac SMS sender script');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.warn('⚠️  Database connection failed, creating in-memory database for build:', errorMessage);
  
  // Create in-memory database for build time
  _sqlite = new Database(':memory:');
  _db = drizzle(_sqlite, { schema: combinedSchema });
  
  console.log('✅ In-memory database created for build process');
}

export const db = _db;

// Export function to close database connection (useful for cleanup)
export function closeDatabase() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
  }
}
