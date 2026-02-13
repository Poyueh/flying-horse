import { Proxy } from '../core';
import { AppNotes } from '../AppNotes';
import { api } from '../../utils/api';

export interface GameConfigData {
  betList: number[];
  mulSteps: number[];
  rtp: number;
}

export interface GameState {
  config: GameConfigData | null;
  betIndex: number;
  betAmount: number;
  currentMultiplier: number;
  pinataHits: number;
  currentRoundId: string;
  winStreak: number;
  autoSettings: {
    active: boolean;
    rounds: number;
    maxRounds: number;
    minMul: number;
    maxMul: number;
  };
}

export class GameProxy extends Proxy {
  static override NAME = 'GameProxy';

  constructor() {
    super(GameProxy.NAME, {
      config: null,
      betIndex: 4,
      betAmount: 1.0,
      currentMultiplier: 1,
      pinataHits: 0,
      currentRoundId: '',
      winStreak: 0,
      autoSettings: {
        active: false,
        rounds: 10,
        maxRounds: 10,
        minMul: 2,
        maxMul: 10000,
      },
    } as GameState);
  }

  get gameState(): GameState {
    return this.data as GameState;
  }

  async loadConfig(): Promise<void> {
    try {
      const config = await api.getGameConfig();
      this.gameState.config = config;

      // Set default bet
      const idx = config.betList.indexOf(1.0);
      this.gameState.betIndex = idx !== -1 ? idx : Math.min(4, config.betList.length - 1);
      this.gameState.betAmount = config.betList[this.gameState.betIndex];

      this.sendNotification(AppNotes.GAME_CONFIG_LOADED, config);
    } catch (error) {
      console.error('Failed to load game config:', error);
    }
  }

  setBet(amount: number): void {
    const betList = this.gameState.config?.betList;
    if (!betList) return;
    const idx = betList.indexOf(amount);
    if (idx !== -1) {
      this.gameState.betIndex = idx;
      this.gameState.betAmount = amount;
      this.sendNotification(AppNotes.BET_CHANGED, amount);
    }
  }

  adjustBet(delta: number): void {
    const betList = this.gameState.config?.betList;
    if (!betList) return;
    let newIdx = this.gameState.betIndex + delta;
    newIdx = Math.max(0, Math.min(betList.length - 1, newIdx));
    this.gameState.betIndex = newIdx;
    this.gameState.betAmount = betList[newIdx];
    this.sendNotification(AppNotes.BET_CHANGED, this.gameState.betAmount);
  }

  async requestLaunch(springMultiplier: number): Promise<void> {
    try {
      const result = await api.launch(this.gameState.betAmount, springMultiplier);
      this.gameState.currentRoundId = result.roundId;
      this.gameState.currentMultiplier = springMultiplier;
      this.gameState.pinataHits = 0;
      this.sendNotification(AppNotes.LAUNCH_RESULT, result);
      this.sendNotification(AppNotes.BALANCE_UPDATED, result.balance);
    } catch (error) {
      this.sendNotification(AppNotes.UI_ERROR, (error as Error).message);
    }
  }

  async requestShoot(): Promise<void> {
    try {
      const result = await api.shoot(
        this.gameState.betAmount,
        this.gameState.currentMultiplier,
        this.gameState.pinataHits,
        this.gameState.currentRoundId
      );
      this.gameState.pinataHits++;

      if (result.result === 'JACKPOT') {
        this.gameState.winStreak++;
      } else if (result.result === 'BAD_EXPLODE' || result.result === 'MISS') {
        if (result.result !== 'MISS') this.gameState.winStreak = 0;
      }

      this.sendNotification(AppNotes.SHOOT_RESULT, result);
      this.sendNotification(AppNotes.BALANCE_UPDATED, result.balance);
    } catch (error) {
      this.sendNotification(AppNotes.UI_ERROR, (error as Error).message);
    }
  }

  resetRound(): void {
    this.gameState.currentMultiplier = 1;
    this.gameState.pinataHits = 0;
    this.gameState.currentRoundId = '';
  }
}
