import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'game.db');
const db = new Database(dbPath);

// Better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    balance REAL DEFAULT 5000,
    role TEXT DEFAULT 'player',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_records (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    bet_amount REAL NOT NULL,
    multiplier REAL NOT NULL,
    win_amount REAL DEFAULT 0,
    bal_after REAL DEFAULT 0,
    game_phase TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS game_config (
    id TEXT PRIMARY KEY DEFAULT 'main',
    bet_list TEXT NOT NULL,
    rtp REAL DEFAULT 0.96,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_records_player ON game_records(player_id);
  CREATE INDEX IF NOT EXISTS idx_records_created ON game_records(created_at);
`);

export default db;
