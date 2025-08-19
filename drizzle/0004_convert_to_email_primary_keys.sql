-- Migration to convert from UUID-based primary keys to email-based primary keys
-- This eliminates the fundamental architectural issue of dual identity systems

-- First, temporarily disable foreign key constraints to allow structural changes
PRAGMA foreign_keys=OFF;

-- 1. Create backup tables with email-based primary keys
CREATE TABLE users_new (
  email TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  strikes INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE reservations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL REFERENCES users_new(email) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('bar', 'mahjong', 'poker')),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'waitlisted', 'cancelled')),
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE poker_waitlist_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES poker_games(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users_new(email) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'confirmed', 'declined')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL REFERENCES users_new(email) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations_new(id) ON DELETE CASCADE,
  poker_game_id INTEGER REFERENCES poker_games(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('24h_reminder', '3h_reminder', '4h_reminder', 'promotion', 'cancellation', 'auto_cancelled', 'poker_confirmation', 'poker_invitation', 'poker_reminder', 'poker_cancellation')),
  method TEXT NOT NULL CHECK(method IN ('email', 'sms')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'confirmed', 'declined', 'expired')),
  confirmation_token TEXT,
  expires_at INTEGER,
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE poker_players_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL REFERENCES users_new(email) ON DELETE CASCADE,
  added_by TEXT NOT NULL CHECK(added_by IN ('admin', 'auto_waitlist')),
  first_waitlist_date INTEGER,
  total_waitlist_joins INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  marketing_opt_in INTEGER DEFAULT 1,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE game_notification_tokens_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  game_id INTEGER NOT NULL REFERENCES poker_games(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users_new(email) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('game_notification', 'waitlist_invite')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'used', 'expired')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 2. Migrate data from old tables to new tables
-- First, populate users_new with data from both existing users table and NextAuth user table
INSERT INTO users_new (email, name, image, phone, role, strikes, is_active, created_at, updated_at)
SELECT DISTINCT
    COALESCE(u.email, uth.email) as email,
    COALESCE(uth.name, u.name) as name,
    COALESCE(uth.image, u.image) as image,
    u.phone,
    COALESCE(u.role, 'user') as role,
    COALESCE(u.strikes, 0) as strikes,
    COALESCE(u.is_active, 1) as is_active,
    COALESCE(u.created_at, strftime('%s', 'now') * 1000) as created_at,
    COALESCE(u.updated_at, strftime('%s', 'now') * 1000) as updated_at
FROM users u
LEFT JOIN user uth ON u.email = uth.email
WHERE u.email IS NOT NULL

UNION

SELECT DISTINCT
    uth.email,
    uth.name,
    uth.image,
    NULL as phone,
    CASE WHEN uth.email = 'haochenhowardyang@gmail.com' THEN 'admin' ELSE 'user' END as role,
    0 as strikes,
    1 as is_active,
    strftime('%s', 'now') * 1000 as created_at,
    strftime('%s', 'now') * 1000 as updated_at
FROM user uth
WHERE uth.email NOT IN (SELECT email FROM users WHERE email IS NOT NULL);

-- 3. Migrate reservations data
INSERT INTO reservations_new (id, user_email, type, date, start_time, end_time, party_size, status, notes, created_at, updated_at)
SELECT 
    r.id,
    u.email as user_email,
    r.type,
    r.date,
    r.start_time,
    r.end_time,
    r.party_size,
    r.status,
    r.notes,
    r.created_at,
    r.updated_at
FROM reservations r
INNER JOIN users u ON r.user_id = u.id
WHERE u.email IS NOT NULL;

-- 4. Migrate poker waitlist data
INSERT INTO poker_waitlist_new (id, game_id, user_email, position, status, created_at, updated_at)
SELECT 
    pw.id,
    pw.game_id,
    u.email as user_email,
    pw.position,
    pw.status,
    pw.created_at,
    pw.updated_at
FROM poker_waitlist pw
INNER JOIN users u ON pw.user_id = u.id
WHERE u.email IS NOT NULL;

-- 5. Migrate notifications data
INSERT INTO notifications_new (id, user_email, reservation_id, poker_game_id, type, method, status, confirmation_token, expires_at, sent_at, created_at)
SELECT 
    n.id,
    u.email as user_email,
    n.reservation_id,
    n.poker_game_id,
    n.type,
    n.method,
    n.status,
    n.confirmation_token,
    n.expires_at,
    n.sent_at,
    n.created_at
FROM notifications n
INNER JOIN users u ON n.user_id = u.id
WHERE u.email IS NOT NULL;

-- 6. Migrate poker players data
INSERT INTO poker_players_new (id, user_email, added_by, first_waitlist_date, total_waitlist_joins, total_games_played, marketing_opt_in, notes, created_at, updated_at)
SELECT 
    pp.id,
    u.email as user_email,
    pp.added_by,
    pp.first_waitlist_date,
    pp.total_waitlist_joins,
    pp.total_games_played,
    pp.marketing_opt_in,
    pp.notes,
    pp.created_at,
    pp.updated_at
FROM poker_players pp
INNER JOIN users u ON pp.user_id = u.id
WHERE u.email IS NOT NULL;

-- 7. Migrate game notification tokens data
INSERT INTO game_notification_tokens_new (id, token, game_id, user_email, type, status, expires_at, used_at, created_at)
SELECT 
    gnt.id,
    gnt.token,
    gnt.game_id,
    u.email as user_email,
    gnt.type,
    gnt.status,
    gnt.expires_at,
    gnt.used_at,
    gnt.created_at
FROM game_notification_tokens gnt
INNER JOIN users u ON gnt.user_id = u.id
WHERE u.email IS NOT NULL;

-- 8. Drop old tables
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS poker_waitlist;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS poker_players;
DROP TABLE IF EXISTS game_notification_tokens;
DROP TABLE IF EXISTS users;

-- 9. Rename new tables to original names
ALTER TABLE users_new RENAME TO users;
ALTER TABLE reservations_new RENAME TO reservations;
ALTER TABLE poker_waitlist_new RENAME TO poker_waitlist;
ALTER TABLE notifications_new RENAME TO notifications;
ALTER TABLE poker_players_new RENAME TO poker_players;
ALTER TABLE game_notification_tokens_new RENAME TO game_notification_tokens;

-- 10. Update NextAuth tables to use email as primary key as well
-- Create new NextAuth tables with email-based primary keys
CREATE TABLE user_new (
  email TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  role TEXT DEFAULT 'user',
  phone TEXT,
  strikes INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  emailVerified DATETIME
);

CREATE TABLE account_new (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES user_new(email) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE TABLE session_new (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL REFERENCES user_new(email) ON DELETE CASCADE,
  expires DATETIME NOT NULL
);

-- Migrate NextAuth data
INSERT INTO user_new (email, name, image, role, phone, strikes, is_active, emailVerified)
SELECT 
    u.email,
    u.name,
    u.image,
    COALESCE(u.role, 'user') as role,
    u.phone,
    COALESCE(u.strikes, 0) as strikes,
    COALESCE(u.is_active, 1) as is_active,
    u.emailVerified
FROM user u;

INSERT INTO account_new (id, user_email, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
SELECT 
    a.id,
    u.email as user_email,
    a.type,
    a.provider,
    a.providerAccountId,
    a.refresh_token,
    a.access_token,
    a.expires_at,
    a.token_type,
    a.scope,
    a.id_token,
    a.session_state
FROM account a
INNER JOIN user u ON a.userId = u.id;

INSERT INTO session_new (id, sessionToken, user_email, expires)
SELECT 
    s.id,
    s.sessionToken,
    u.email as user_email,
    s.expires
FROM session s
INNER JOIN user u ON s.userId = u.id;

-- Drop old NextAuth tables
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user;

-- Rename new NextAuth tables
ALTER TABLE user_new RENAME TO user;
ALTER TABLE account_new RENAME TO account;
ALTER TABLE session_new RENAME TO session;

-- Re-enable foreign key constraints
PRAGMA foreign_keys=ON;

-- Create indexes for better performance on email lookups
CREATE INDEX idx_reservations_user_email ON reservations(user_email);
CREATE INDEX idx_poker_waitlist_user_email ON poker_waitlist(user_email);
CREATE INDEX idx_notifications_user_email ON notifications(user_email);
CREATE INDEX idx_poker_players_user_email ON poker_players(user_email);
CREATE INDEX idx_game_notification_tokens_user_email ON game_notification_tokens(user_email);
CREATE INDEX idx_account_user_email ON account(user_email);
CREATE INDEX idx_session_user_email ON session(user_email);
