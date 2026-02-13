import { Router } from 'express';
import { getHistory, getStats } from '../controllers/recordsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/history', authMiddleware, getHistory);
router.get('/stats', authMiddleware, getStats);

export default router;
