import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }

    const existing = await prisma.player.findUnique({ where: { username } });
    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const player = await prisma.player.create({
      data: {
        username,
        password: hashedPassword,
        nickname: nickname || username,
        balance: config.defaultBalance,
      },
    });

    const token = jwt.sign(
      { id: player.id, role: player.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      token,
      player: {
        id: player.id,
        username: player.username,
        nickname: player.nickname,
        balance: player.balance,
        role: player.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { username } });
    if (!player) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (player.status === 'suspended') {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    const valid = await bcrypt.compare(password, player.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: player.id, role: player.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        nickname: player.nickname,
        balance: player.balance,
        role: player.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        balance: true,
        role: true,
        createdAt: true,
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.json({ player });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
