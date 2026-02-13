import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import recordsRoutes from './routes/records';
import adminRoutes from './routes/admin';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start
app.listen(config.port, () => {
  console.log(`\n🐴 Flying Horse Backend running at http://localhost:${config.port}`);
  console.log(`   Health: http://localhost:${config.port}/api/health`);
  console.log(`\n   API Endpoints:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/game/config`);
  console.log(`   POST /api/game/launch`);
  console.log(`   POST /api/game/shoot`);
  console.log(`   GET  /api/records/history`);
  console.log(`   GET  /api/admin/reports`);
  console.log('');
});
