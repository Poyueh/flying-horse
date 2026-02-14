import prisma from './config/database';
import bcrypt from 'bcryptjs';
import { config } from './config';

async function seed() {
  console.log('Seeding database...');

  // Create admin
  const adminPw = await bcrypt.hash('admin123', 10);
  await prisma.player.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPw,
      nickname: 'Administrator',
      balance: 99999,
      role: 'admin',
    },
  });

  // Create test player
  const playerPw = await bcrypt.hash('test123', 10);
  await prisma.player.upsert({
    where: { username: 'player1' },
    update: {},
    create: {
      username: 'player1',
      password: playerPw,
      nickname: 'Test Player',
      balance: config.defaultBalance,
      role: 'player',
    },
  });

  // Create game config
  await prisma.gameConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      betList: JSON.stringify(config.defaultBetList),
      rtp: config.defaultRTP,
    },
  });

  console.log('Seed complete!');
  console.log('  Admin: admin / admin123');
  console.log('  Player: player1 / test123');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
