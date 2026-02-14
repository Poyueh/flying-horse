import { Router } from 'express';
import {
  getPlayers,
  getPlayerDetail,
  updatePlayerBalance,
  updatePlayerStatus,
  getReports,
  getGameConfig,
  updateGameConfig,
} from '../controllers/adminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/players', getPlayers);
router.get('/players/:id', getPlayerDetail);
router.put('/players/:id/balance', updatePlayerBalance);
router.put('/players/:id/status', updatePlayerStatus);
router.get('/reports', getReports);
router.get('/game-config', getGameConfig);
router.put('/game-config', updateGameConfig);

export default router;
