import { Response } from 'express';
import prisma from '../config/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export async function getPlayers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search } },
            { nickname: { contains: search } },
          ],
        }
      : {};

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          nickname: true,
          balance: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { records: true } },
        },
      }),
      prisma.player.count({ where }),
    ]);

    res.json({
      players: players.map(p => ({
        ...p,
        totalGames: p._count.records,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GetPlayers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPlayerDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        balance: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Aggregate stats
    const records = await prisma.gameRecord.findMany({ where: { playerId: id } });
    const totalWagered = records.reduce((sum, r) => sum + r.betAmount, 0);
    const totalWon = records.reduce((sum, r) => sum + r.winAmount, 0);
    const jackpots = records.filter(r => r.result === 'jackpot').length;

    const recentRecords = await prisma.gameRecord.findMany({
      where: { playerId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      player,
      stats: {
        totalGames: records.length,
        totalWagered: Math.round(totalWagered * 100) / 100,
        totalWon: Math.round(totalWon * 100) / 100,
        netProfit: Math.round((totalWon - totalWagered) * 100) / 100,
        jackpots,
        rtp: totalWagered > 0 ? Math.round((totalWon / totalWagered) * 10000) / 100 : 0,
      },
      recentRecords,
    });
  } catch (error) {
    console.error('GetPlayerDetail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePlayerBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (typeof amount !== 'number') {
      res.status(400).json({ error: 'Amount must be a number' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const newBalance = player.balance + amount;
    if (newBalance < 0) {
      res.status(400).json({ error: 'Balance cannot be negative' });
      return;
    }

    const updated = await prisma.player.update({
      where: { id },
      data: { balance: newBalance },
    });

    console.log(`[Admin] Balance adjust: player=${id} amount=${amount} reason=${reason || 'N/A'} newBal=${newBalance}`);

    res.json({
      playerId: id,
      previousBalance: player.balance,
      adjustment: amount,
      newBalance: updated.balance,
    });
  } catch (error) {
    console.error('UpdatePlayerBalance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePlayerStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'Status must be active or suspended' });
      return;
    }

    await prisma.player.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('UpdatePlayerStatus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReports(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalPlayers = await prisma.player.count();
    const activePlayers = await prisma.player.count({ where: { status: 'active' } });

    const allRecords = await prisma.gameRecord.findMany();

    const totalBets = allRecords.length;
    const totalWagered = allRecords.reduce((s, r) => s + r.betAmount, 0);
    const totalPaid = allRecords.reduce((s, r) => s + r.winAmount, 0);
    const houseEdge = totalWagered - totalPaid;
    const actualRTP = totalWagered > 0 ? (totalPaid / totalWagered) * 100 : 0;
    const jackpots = allRecords.filter(r => r.result === 'jackpot').length;

    // Daily breakdown (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRecords = allRecords.filter(r => r.createdAt >= sevenDaysAgo);

    const dailyMap = new Map<string, { wagered: number; paid: number; bets: number }>();
    recentRecords.forEach(r => {
      const day = r.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(day) || { wagered: 0, paid: 0, bets: 0 };
      existing.wagered += r.betAmount;
      existing.paid += r.winAmount;
      existing.bets++;
      dailyMap.set(day, existing);
    });

    const dailyReport = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
        profit: Math.round((data.wagered - data.paid) * 100) / 100,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      overview: {
        totalPlayers,
        activePlayers,
        totalBets,
        totalWagered: Math.round(totalWagered * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        houseEdge: Math.round(houseEdge * 100) / 100,
        actualRTP: Math.round(actualRTP * 100) / 100,
        jackpots,
      },
      dailyReport,
    });
  } catch (error) {
    console.error('GetReports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getGameConfig(_req: AuthRequest, res: Response): Promise<void> {
  try {
    let gameConfig = await prisma.gameConfig.findUnique({ where: { id: 'main' } });
    if (!gameConfig) {
      gameConfig = await prisma.gameConfig.create({
        data: {
          id: 'main',
          betList: JSON.stringify(config.defaultBetList),
          rtp: config.defaultRTP,
        },
      });
    }

    res.json({
      betList: JSON.parse(gameConfig.betList) as number[],
      rtp: gameConfig.rtp,
    });
  } catch (error) {
    console.error('GetGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateGameConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betList, rtp } = req.body;

    if (betList) {
      if (!Array.isArray(betList) || betList.length < 5) {
        res.status(400).json({ error: 'betList must be an array with at least 5 items' });
        return;
      }
      if (!betList.every((b: unknown) => typeof b === 'number' && b > 0)) {
        res.status(400).json({ error: 'All bet values must be positive numbers' });
        return;
      }
    }

    if (rtp !== undefined) {
      if (typeof rtp !== 'number' || rtp < 0.5 || rtp > 1.0) {
        res.status(400).json({ error: 'RTP must be between 0.5 and 1.0' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (betList) updateData.betList = JSON.stringify(betList.sort((a: number, b: number) => a - b));
    if (rtp !== undefined) updateData.rtp = rtp;

    const updated = await prisma.gameConfig.upsert({
      where: { id: 'main' },
      update: updateData,
      create: {
        id: 'main',
        betList: JSON.stringify(betList || config.defaultBetList),
        rtp: rtp || config.defaultRTP,
      },
    });

    res.json({
      betList: JSON.parse(updated.betList) as number[],
      rtp: updated.rtp,
    });
  } catch (error) {
    console.error('UpdateGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
