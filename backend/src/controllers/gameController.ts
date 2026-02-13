import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { mathModel } from '../services/mathModel';

export async function getGameConfig(_req: AuthRequest, res: Response): Promise<void> {
  try {
    let row = db.prepare('SELECT * FROM game_config WHERE id = ?').get('main') as any;
    if (!row) {
      db.prepare('INSERT INTO game_config (id, bet_list, rtp) VALUES (?, ?, ?)').run(
        'main', JSON.stringify(config.defaultBetList), config.defaultRTP
      );
      row = { bet_list: JSON.stringify(config.defaultBetList), rtp: config.defaultRTP };
    }
    res.json({ betList: JSON.parse(row.bet_list), mulSteps: config.mulSteps, rtp: row.rtp });
  } catch (error) {
    console.error('GetGameConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const player = db.prepare('SELECT balance FROM players WHERE id = ?').get(req.userId) as any;
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json({ balance: player.balance });
  } catch (error) {
    console.error('GetBalance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function launch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betAmount, springMultiplier } = req.body;
    if (!betAmount || !springMultiplier) { res.status(400).json({ error: 'betAmount and springMultiplier required' }); return; }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.userId) as any;
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
    if (player.balance < betAmount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const newBalance = player.balance - betAmount;
    const result = mathModel.getLaunchResult(betAmount);
    const finalBalance = newBalance + result.winAmount;

    db.prepare('UPDATE players SET balance = ?, updated_at = datetime("now") WHERE id = ?').run(finalBalance, req.userId);

    const roundId = uuidv4().slice(0, 8);
    db.prepare('INSERT INTO game_records (id, round_id, player_id, bet_amount, multiplier, win_amount, bal_after, game_phase, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), roundId, req.userId, betAmount, springMultiplier, result.winAmount, finalBalance, 'launch', result.isWin ? 'win' : 'lose'
    );

    res.json({ roundId, isWin: result.isWin, winAmount: result.winAmount, launchMultiplier: result.multiplier, balance: finalBalance });
  } catch (error) {
    console.error('Launch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function shoot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { betAmount, currentMultiplier, pinataHits, roundId } = req.body;
    if (!betAmount || !currentMultiplier || pinataHits === undefined) { res.status(400).json({ error: 'Missing fields' }); return; }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.userId) as any;
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
    if (player.balance < betAmount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    let newBalance = player.balance - betAmount;
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
      case 'BAD_EXPLODE': resultStr = 'bad_explode'; break;
      default: resultStr = 'miss'; break;
    }

    db.prepare('UPDATE players SET balance = ?, updated_at = datetime("now") WHERE id = ?').run(newBalance, req.userId);

    const newRoundId = roundId || uuidv4().slice(0, 8);
    db.prepare('INSERT INTO game_records (id, round_id, player_id, bet_amount, multiplier, win_amount, bal_after, game_phase, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), newRoundId, req.userId, betAmount, currentMultiplier, winAmount, newBalance, 'shoot', resultStr
    );

    res.json({ roundId: newRoundId, result: shootResult.result, winAmount, balance: newBalance });
  } catch (error) {
    console.error('Shoot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
