import { Response } from 'express';
import prisma from '../config/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { mathModel } from '../services/mathModel';
import { v4 as uuidv4 } from 'uuid';

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

    const betList: number[] = JSON.parse(gameConfig.betList);

    res.json({
      betList,
      mulSteps: config.mulSteps,
      rtp: gameConfig.rtp,
    });
  } catch (error) {
    console.error('GetGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.userId },
      select: { balance: true },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.json({ balance: player.balance });
  } catch (error) {
    console.error('GetBalance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function launch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betAmount, springMultiplier } = req.body;

    if (!betAmount || !springMultiplier) {
      res.status(400).json({ error: 'betAmount and springMultiplier are required' });
      return;
    }

    // Validate bet amount
    const gameConfig = await prisma.gameConfig.findUnique({ where: { id: 'main' } });
    const betList: number[] = gameConfig ? JSON.parse(gameConfig.betList) : config.defaultBetList;

    if (!betList.includes(betAmount)) {
      res.status(400).json({ error: 'Invalid bet amount' });
      return;
    }

    // Get player
    const player = await prisma.player.findUnique({ where: { id: req.userId } });
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.balance < betAmount) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Deduct bet
    const newBalance = player.balance - betAmount;

    // Calculate result
    const result = mathModel.getLaunchResult(betAmount);
    const finalBalance = newBalance + result.winAmount;

    // Update player balance
    await prisma.player.update({
      where: { id: req.userId },
      data: { balance: finalBalance },
    });

    // Record game history
    const roundId = uuidv4().slice(0, 8);
    await prisma.gameRecord.create({
      data: {
        roundId,
        playerId: req.userId!,
        betAmount,
        multiplier: springMultiplier,
        winAmount: result.winAmount,
        balAfter: finalBalance,
        gamePhase: 'launch',
        result: result.isWin ? 'win' : 'lose',
      },
    });

    res.json({
      roundId,
      isWin: result.isWin,
      winAmount: result.winAmount,
      launchMultiplier: result.multiplier,
      balance: finalBalance,
    });
  } catch (error) {
    console.error('Launch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function shoot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betAmount, currentMultiplier, pinataHits, roundId } = req.body;

    if (!betAmount || !currentMultiplier || pinataHits === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get player
    const player = await prisma.player.findUnique({ where: { id: req.userId } });
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.balance < betAmount) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Deduct bet
    let newBalance = player.balance - betAmount;

    // Calculate result
    const shootResult = mathModel.getShootResult(currentMultiplier, pinataHits);

    let winAmount = 0;
    let resultStr = shootResult.result.toLowerCase();

    switch (shootResult.result) {
      case 'JACKPOT':
        winAmount = betAmount * currentMultiplier;
        newBalance += winAmount;
        resultStr = 'jackpot';
        break;
      case 'SMALL_WIN':
        winAmount = mathModel.getSmallWinAmount(betAmount);
        newBalance += winAmount;
        resultStr = 'small_win';
        break;
      case 'BAD_EXPLODE':
        resultStr = 'bad_explode';
        break;
      case 'MISS':
        resultStr = 'miss';
        break;
    }

    // Update balance
    await prisma.player.update({
      where: { id: req.userId },
      data: { balance: newBalance },
    });

    // Record
    const newRoundId = roundId || uuidv4().slice(0, 8);
    await prisma.gameRecord.create({
      data: {
        roundId: newRoundId,
        playerId: req.userId!,
        betAmount,
        multiplier: currentMultiplier,
        winAmount,
        balAfter: newBalance,
        gamePhase: 'shoot',
        result: resultStr,
      },
    });

    res.json({
      roundId: newRoundId,
      result: shootResult.result,
      winAmount,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Shoot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
