#!/usr/bin/env node
// Universal Database Reset Script for Club Reservation Service
// Works for both local development and production volumes

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

// Configuration
const projectRoot = path.join(__dirname, '..');
const migrationFile = path.join(projectRoot, 'drizzle', '0000_initial_schema.sql');

// Determine database path based on environment
const getDatabasePath = () => {
  // Check if we're in a volume environment
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Check if /data directory exists (volume environment)
  if (fs.existsSync('/data')) {
    return '/data/sqlite.db';
  }
  
  // Default to local development
  return path.join(projectRoot, 'sqlite.db');
};

const dbPath = getDatabasePath();
const isVolumeEnvironment = dbPath.includes('/data/');
const isProduction = process.env.NODE_ENV === 'production' || isVolumeEnvironment;

// Admin email from command line or default
const adminEmail = process.argv[2] || 'haochenhowardyang@gmail.com';

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(adminEmail)) {
  log('red', '❌ Invalid email format provided');
  console.log('Usage: node reset-database.js your-email@example.com');
  process.exit(1);
}

// Main function
async function resetDatabase() {
  log('blue', '🔄 Universal Database Reset for Club Reservation Service');
  log('blue', '=====================================================');
  
  console.log(`📧 Admin email: ${adminEmail}`);
  console.log(`📁 Database path: ${dbPath}`);
  console.log(`🌍 Environment: ${isProduction ? 'Production/Volume' : 'Local Development'}`);
  console.log(`📄 Migration file: ${migrationFile}`);
  
  // Step 1: Verify migration file exists
  if (!fs.existsSync(migrationFile)) {
    log('red', '❌ Migration file not found: drizzle/0000_initial_schema.sql');
    log('yellow', '💡 Make sure you have consolidated your migrations first');
    process.exit(1);
  }

  // Step 2: Production safety check
  if (isProduction) {
    log('yellow', '⚠️  PRODUCTION ENVIRONMENT DETECTED');
    log('yellow', '   This will permanently delete all data in your production database!');
    
    if (isVolumeEnvironment) {
      log('cyan', '💡 Consider creating a volume snapshot first:');
      log('cyan', '   ./scripts/database/backup-volumes.sh create');
      console.log('');
    }
    
    // Require explicit confirmation for production
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Type "RESET" to confirm you want to reset the production database: ', resolve);
    });
    rl.close();
    
    if (answer !== 'RESET') {
      log('yellow', '❌ Reset cancelled - confirmation not provided');
      process.exit(0);
    }
  }

  try {
    // Step 3: Create backup if database exists
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = isVolumeEnvironment 
        ? `/data/sqlite.db.backup.${timestamp}`
        : path.join(projectRoot, 'backups', `sqlite.db.backup.${timestamp}`);
      
      // Create backup directory for local development
      if (!isVolumeEnvironment) {
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
      }
      
      log('yellow', '📦 Creating backup of existing database...');
      fs.copyFileSync(dbPath, backupPath);
      log('green', `✅ Backup created: ${backupPath}`);
      
      // Create data dump for reference
      try {
        const db = new Database(dbPath);
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        
        if (tables.length > 0) {
          const dumpPath = isVolumeEnvironment 
            ? `/data/database-dump.${timestamp}.sql`
            : path.join(projectRoot, 'backups', `database-dump.${timestamp}.sql`);
          
          let dumpContent = `-- Database dump created on ${new Date().toISOString()}\n`;
          dumpContent += `-- Environment: ${isProduction ? 'Production' : 'Development'}\n`;
          dumpContent += `-- Admin email: ${adminEmail}\n\n`;
          
          let totalRows = 0;
          for (const table of tables) {
            const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
            totalRows += rows.length;
            if (rows.length > 0) {
              dumpContent += `-- Table: ${table.name} (${rows.length} rows)\n`;
              for (const row of rows) {
                const columns = Object.keys(row).join(', ');
                const values = Object.values(row).map(val => {
                  if (val === null) return 'NULL';
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                  return val;
                }).join(', ');
                dumpContent += `INSERT INTO ${table.name} (${columns}) VALUES (${values});\n`;
              }
              dumpContent += '\n';
            }
          }
          
          fs.writeFileSync(dumpPath, dumpContent);
          log('green', `✅ Data dump created: ${path.basename(dumpPath)} (${totalRows} total rows)`);
        }
        
        db.close();
      } catch (dumpError) {
        log('yellow', '⚠️  Could not create data dump (database may be locked)');
      }
    } else {
      log('blue', 'ℹ️  No existing database found - creating fresh database');
    }

    // Step 4: Remove existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      log('green', '🗑️  Removed existing database');
    }

    // Step 5: Create fresh database from migration
    log('blue', '🔨 Creating fresh database from consolidated migration...');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    // Ensure directory exists for volume environments
    if (isVolumeEnvironment) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }
    
    const db = new Database(dbPath);
    
    // Execute the migration SQL
    db.exec(migrationSQL);
    log('green', '✅ Database schema created from migration file');

    // Step 6: Add admin user to whitelist
    log('blue', `👤 Adding admin user to whitelist: ${adminEmail}`);
    
    try {
      const insertStmt = db.prepare('INSERT INTO email_whitelist (email, created_at) VALUES (?, ?)');
      insertStmt.run(adminEmail, Date.now());
      log('green', `✅ Added ${adminEmail} to whitelist`);
    } catch (insertError) {
      if (insertError.message.includes('UNIQUE constraint failed')) {
        log('yellow', `⚠️  ${adminEmail} already exists in whitelist`);
      } else {
        throw insertError;
      }
    }

    // Step 7: Verify database integrity
    log('blue', '🔍 Verifying database integrity...');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    log('green', `✅ Created ${tables.length} tables: ${tables.map(t => t.name).join(', ')}`);

    // Test database connection
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM email_whitelist').get();
    log('green', `✅ Database connection test passed (${testQuery.count} whitelist entries)`);

    db.close();

    // Step 8: Success summary
    log('green', '\n🎉 Database reset completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  • Environment: ${isProduction ? 'Production/Volume' : 'Local Development'}`);
    console.log(`  • Database: ${dbPath}`);
    console.log(`  • Schema: Fresh from drizzle/0000_initial_schema.sql`);
    console.log(`  • Admin user: ${adminEmail} (whitelisted)`);
    
    if (isVolumeEnvironment) {
      console.log('\n🚀 Volume-specific notes:');
      console.log('  • Data will persist across deployments');
      console.log('  • Backups are stored in /data/ directory');
      console.log('  • Consider regular volume snapshots for additional safety');
    } else {
      console.log('\n💻 Local development notes:');
      console.log('  • Backups are stored in ./backups/ directory');
      console.log('  • You can now start your development server');
    }
    
    console.log('\n✨ Next steps:');
    console.log('  1. Start your application');
    console.log('  2. Sign in with your admin email');
    console.log('  3. Verify all functionality works correctly');
    
    if (isVolumeEnvironment) {
      console.log('  4. Create a volume snapshot of the fresh database');
    }

  } catch (error) {
    log('red', `❌ Error resetting database: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
resetDatabase().catch(error => {
  log('red', `❌ Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
