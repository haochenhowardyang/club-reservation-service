import type { Config } from 'drizzle-kit';
import path from 'path';

// Get the current working directory to make paths absolute
const cwd = process.cwd();

export default {
  schema: [
    path.resolve(cwd, 'src/lib/db/schema.ts'), 
    path.resolve(cwd, 'src/lib/db/auth-schema.ts')
  ],
  out: path.resolve(cwd, 'drizzle'),
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || path.resolve(cwd, 'sqlite.db'),
  },
} satisfies Config;
