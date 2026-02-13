import { Router } from 'express';
import { getGameConfig, getBalance, launch, shoot } from '../controllers/gameController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/config', getGameConfig);
router.get('/balance', authMiddleware, getBalance);
router.post('/launch', authMiddleware, launch);
router.post('/shoot', authMiddleware, shoot);

export default router;
