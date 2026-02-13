import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const records = db.prepare(
      'SELECT id, round_id, bet_amount, multiplier, win_amount, bal_after, game_phase, result, created_at FROM game_records WHERE player_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(req.userId, limit, offset) as any[];

    const countRow = db.prepare('SELECT COUNT(*) as total FROM game_records WHERE player_id = ?').get(req.userId) as any;
    const total = countRow.total;

    res.json({
      records: records.map(r => ({
        id: r.id, roundId: r.round_id, betAmount: r.bet_amount, multiplier: r.multiplier,
        winAmount: r.win_amount, balAfter: r.bal_after, gamePhase: r.game_phase,
        result: r.result, createdAt: r.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GetHistory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_bets,
        COALESCE(SUM(bet_amount), 0) as total_wagered,
        COALESCE(SUM(win_amount), 0) as total_won,
        COALESCE(MAX(win_amount), 0) as biggest_win,
        SUM(CASE WHEN result = 'jackpot' THEN 1 ELSE 0 END) as jackpots
      FROM game_records WHERE player_id = ?
    `).get(req.userId) as any;

    const totalWagered = stats.total_wagered;
    const totalWon = stats.total_won;

    res.json({
      totalBets: stats.total_bets,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalWon: Math.round(totalWon * 100) / 100,
      netProfit: Math.round((totalWon - totalWagered) * 100) / 100,
      jackpots: stats.jackpots,
      biggestWin: Math.round(stats.biggest_win * 100) / 100,
      playerRTP: totalWagered > 0 ? Math.round((totalWon / totalWagered) * 10000) / 100 : 0,
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
