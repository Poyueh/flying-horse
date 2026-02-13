import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './config/database';
import { config } from './config';

async function seed() {
  console.log('Seeding database...');

  // Create admin
  const adminPw = await bcrypt.hash('admin123', 10);
  const existingAdmin = db.prepare('SELECT id FROM players WHERE username = ?').get('admin');
  if (!existingAdmin) {
    db.prepare('INSERT INTO players (id, username, password, nickname, balance, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      uuidv4(), 'admin', adminPw, 'Administrator', 99999, 'admin'
    );
    console.log('  Created admin: admin / admin123');
  } else {
    console.log('  Admin already exists, skipping');
  }

  // Create test player
  const playerPw = await bcrypt.hash('test123', 10);
  const existingPlayer = db.prepare('SELECT id FROM players WHERE username = ?').get('player1');
  if (!existingPlayer) {
    db.prepare('INSERT INTO players (id, username, password, nickname, balance, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      uuidv4(), 'player1', playerPw, 'Test Player', config.defaultBalance, 'player'
    );
    console.log('  Created player: player1 / test123');
  } else {
    console.log('  player1 already exists, skipping');
  }

  // Create game config
  const existingConfig = db.prepare('SELECT id FROM game_config WHERE id = ?').get('main');
  if (!existingConfig) {
    db.prepare('INSERT INTO game_config (id, bet_list, rtp) VALUES (?, ?, ?)').run(
      'main', JSON.stringify(config.defaultBetList), config.defaultRTP
    );
    console.log('  Created game config');
  } else {
    console.log('  Game config already exists, skipping');
  }

  console.log('\nSeed complete!');
}

seed().catch(console.error);
