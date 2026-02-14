import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.gameRecord.findMany({
        where: { playerId: req.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          roundId: true,
          betAmount: true,
          multiplier: true,
          winAmount: true,
          balAfter: true,
          gamePhase: true,
          result: true,
          createdAt: true,
        },
      }),
      prisma.gameRecord.count({ where: { playerId: req.userId } }),
    ]);

    res.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GetHistory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const records = await prisma.gameRecord.findMany({
      where: { playerId: req.userId },
    });

    const totalBets = records.length;
    const totalWagered = records.reduce((sum, r) => sum + r.betAmount, 0);
    const totalWon = records.reduce((sum, r) => sum + r.winAmount, 0);
    const jackpots = records.filter(r => r.result === 'jackpot').length;
    const biggestWin = records.reduce((max, r) => Math.max(max, r.winAmount), 0);
    const playerRTP = totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0;

    res.json({
      totalBets,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalWon: Math.round(totalWon * 100) / 100,
      netProfit: Math.round((totalWon - totalWagered) * 100) / 100,
      jackpots,
      biggestWin: Math.round(biggestWin * 100) / 100,
      playerRTP: Math.round(playerRTP * 100) / 100,
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
