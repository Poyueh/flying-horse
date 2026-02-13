import { Proxy } from '../core';
import { AppNotes } from '../AppNotes';
import { api, setToken, getToken, PlayerInfo } from '../../utils/api';

export interface PlayerData {
  isLoggedIn: boolean;
  player: PlayerInfo | null;
  token: string | null;
}

export class PlayerProxy extends Proxy {
  static override NAME = 'PlayerProxy';

  constructor() {
    super(PlayerProxy.NAME, {
      isLoggedIn: false,
      player: null,
      token: getToken(),
    } as PlayerData);
  }

  get playerData(): PlayerData {
    return this.data as PlayerData;
  }

  override async onRegister(): Promise<void> {
    // Try to restore session
    if (this.playerData.token) {
      try {
        const { player } = await api.getProfile();
        this.playerData.isLoggedIn = true;
        this.playerData.player = player;
        this.sendNotification(AppNotes.LOGIN_SUCCESS, player);
      } catch {
        setToken(null);
        this.playerData.token = null;
      }
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const result = await api.login(username, password);
      setToken(result.token);
      this.playerData.isLoggedIn = true;
      this.playerData.player = result.player;
      this.playerData.token = result.token;
      this.sendNotification(AppNotes.LOGIN_SUCCESS, result.player);
    } catch (error) {
      this.sendNotification(AppNotes.LOGIN_FAILED, (error as Error).message);
    }
  }

  async register(username: string, password: string, nickname?: string): Promise<void> {
    try {
      const result = await api.register(username, password, nickname);
      setToken(result.token);
      this.playerData.isLoggedIn = true;
      this.playerData.player = result.player;
      this.playerData.token = result.token;
      this.sendNotification(AppNotes.REGISTER_SUCCESS, result.player);
    } catch (error) {
      this.sendNotification(AppNotes.REGISTER_FAILED, (error as Error).message);
    }
  }

  logout(): void {
    setToken(null);
    this.playerData.isLoggedIn = false;
    this.playerData.player = null;
    this.playerData.token = null;
    this.sendNotification(AppNotes.LOGOUT);
  }

  updateBalance(balance: number): void {
    if (this.playerData.player) {
      this.playerData.player.balance = balance;
      this.sendNotification(AppNotes.BALANCE_UPDATED, balance);
    }
  }

  get balance(): number {
    return this.playerData.player?.balance ?? 0;
  }

  get isAdmin(): boolean {
    return this.playerData.player?.role === 'admin';
  }
}
