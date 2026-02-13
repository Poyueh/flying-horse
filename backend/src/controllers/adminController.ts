import { Response } from 'express';
import db from '../config/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export async function getPlayers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let players: any[], total: number;
    if (search) {
      players = db.prepare(
        'SELECT id, username, nickname, balance, role, status, created_at FROM players WHERE username LIKE ? OR nickname LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).all(`%${search}%`, `%${search}%`, limit, offset) as any[];
      total = (db.prepare('SELECT COUNT(*) as c FROM players WHERE username LIKE ? OR nickname LIKE ?').get(`%${search}%`, `%${search}%`) as any).c;
    } else {
      players = db.prepare('SELECT id, username, nickname, balance, role, status, created_at FROM players ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
      total = (db.prepare('SELECT COUNT(*) as c FROM players').get() as any).c;
    }

    const result = players.map(p => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM game_records WHERE player_id = ?').get(p.id) as any).c;
      return { ...p, totalGames: count, createdAt: p.created_at };
    });

    res.json({ players: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('GetPlayers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPlayerDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const player = db.prepare('SELECT id, username, nickname, balance, role, status, created_at FROM players WHERE id = ?').get(id) as any;
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }

    const stats = db.prepare(`
      SELECT COUNT(*) as total, COALESCE(SUM(bet_amount),0) as wagered, COALESCE(SUM(win_amount),0) as won,
      SUM(CASE WHEN result='jackpot' THEN 1 ELSE 0 END) as jackpots
      FROM game_records WHERE player_id = ?
    `).get(id) as any;

    const recentRecords = db.prepare('SELECT * FROM game_records WHERE player_id = ? ORDER BY created_at DESC LIMIT 50').all(id);

    res.json({
      player,
      stats: {
        totalGames: stats.total,
        totalWagered: Math.round(stats.wagered * 100) / 100,
        totalWon: Math.round(stats.won * 100) / 100,
        netProfit: Math.round((stats.won - stats.wagered) * 100) / 100,
        jackpots: stats.jackpots,
        rtp: stats.wagered > 0 ? Math.round((stats.won / stats.wagered) * 10000) / 100 : 0,
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
    if (typeof amount !== 'number') { res.status(400).json({ error: 'Amount must be number' }); return; }

    const player = db.prepare('SELECT balance FROM players WHERE id = ?').get(id) as any;
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }

    const newBalance = player.balance + amount;
    if (newBalance < 0) { res.status(400).json({ error: 'Balance cannot be negative' }); return; }

    db.prepare('UPDATE players SET balance = ?, updated_at = datetime("now") WHERE id = ?').run(newBalance, id);
    console.log(`[Admin] Balance adjust: player=${id} amount=${amount} reason=${reason || 'N/A'} newBal=${newBalance}`);

    res.json({ playerId: id, previousBalance: player.balance, adjustment: amount, newBalance });
  } catch (error) {
    console.error('UpdatePlayerBalance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePlayerStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
    db.prepare('UPDATE players SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (error) {
    console.error('UpdatePlayerStatus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReports(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalPlayers = (db.prepare('SELECT COUNT(*) as c FROM players').get() as any).c;
    const activePlayers = (db.prepare('SELECT COUNT(*) as c FROM players WHERE status = ?').get('active') as any).c;

    const overall = db.prepare(`
      SELECT COUNT(*) as total_bets, COALESCE(SUM(bet_amount),0) as wagered, COALESCE(SUM(win_amount),0) as paid,
      SUM(CASE WHEN result='jackpot' THEN 1 ELSE 0 END) as jackpots
      FROM game_records
    `).get() as any;

    const houseEdge = overall.wagered - overall.paid;
    const actualRTP = overall.wagered > 0 ? (overall.paid / overall.wagered) * 100 : 0;

    const dailyReport = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as bets, SUM(bet_amount) as wagered, SUM(win_amount) as paid
      FROM game_records WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at) ORDER BY date DESC
    `).all() as any[];

    res.json({
      overview: {
        totalPlayers, activePlayers, totalBets: overall.total_bets,
        totalWagered: Math.round(overall.wagered * 100) / 100,
        totalPaid: Math.round(overall.paid * 100) / 100,
        houseEdge: Math.round(houseEdge * 100) / 100,
        actualRTP: Math.round(actualRTP * 100) / 100,
        jackpots: overall.jackpots,
      },
      dailyReport: dailyReport.map(d => ({
        date: d.date, bets: d.bets,
        wagered: Math.round(d.wagered * 100) / 100,
        paid: Math.round(d.paid * 100) / 100,
        profit: Math.round((d.wagered - d.paid) * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('GetReports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getGameConfig(_req: AuthRequest, res: Response): Promise<void> {
  try {
    let row = db.prepare('SELECT * FROM game_config WHERE id = ?').get('main') as any;
    if (!row) {
      db.prepare('INSERT INTO game_config (id, bet_list, rtp) VALUES (?, ?, ?)').run('main', JSON.stringify(config.defaultBetList), config.defaultRTP);
      row = { bet_list: JSON.stringify(config.defaultBetList), rtp: config.defaultRTP };
    }
    res.json({ betList: JSON.parse(row.bet_list), rtp: row.rtp });
  } catch (error) {
    console.error('GetGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateGameConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betList, rtp } = req.body;
    if (betList && (!Array.isArray(betList) || betList.length < 5)) {
      res.status(400).json({ error: 'betList must have at least 5 items' }); return;
    }
    if (rtp !== undefined && (typeof rtp !== 'number' || rtp < 0.5 || rtp > 1.0)) {
      res.status(400).json({ error: 'RTP must be 0.5-1.0' }); return;
    }

    const existing = db.prepare('SELECT * FROM game_config WHERE id = ?').get('main') as any;
    const newBetList = betList ? JSON.stringify(betList.sort((a: number, b: number) => a - b)) : existing?.bet_list || JSON.stringify(config.defaultBetList);
    const newRtp = rtp !== undefined ? rtp : existing?.rtp || config.defaultRTP;

    db.prepare('INSERT OR REPLACE INTO game_config (id, bet_list, rtp, updated_at) VALUES (?, ?, ?, datetime("now"))').run('main', newBetList, newRtp);

    res.json({ betList: JSON.parse(newBetList), rtp: newRtp });
  } catch (error) {
    console.error('UpdateGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
