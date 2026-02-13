// ============================================
// API Service - communicates with backend
// ============================================

const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('fh_token');

export function setToken(token: string | null): void {
  authToken = token;
  if (token) localStorage.setItem('fh_token', token);
  else localStorage.removeItem('fh_token');
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data as T;
}

// Auth
export interface LoginResponse {
  token: string;
  player: PlayerInfo;
}

export interface PlayerInfo {
  id: string;
  username: string;
  nickname: string;
  balance: number;
  role: string;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string, nickname?: string) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, nickname }),
    }),

  getProfile: () => request<{ player: PlayerInfo }>('/auth/profile'),

  // Game
  getGameConfig: () =>
    request<{ betList: number[]; mulSteps: number[]; rtp: number }>('/game/config'),

  getBalance: () => request<{ balance: number }>('/game/balance'),

  launch: (betAmount: number, springMultiplier: number) =>
    request<{
      roundId: string;
      isWin: boolean;
      winAmount: number;
      launchMultiplier: number;
      balance: number;
    }>('/game/launch', {
      method: 'POST',
      body: JSON.stringify({ betAmount, springMultiplier }),
    }),

  shoot: (betAmount: number, currentMultiplier: number, pinataHits: number, roundId?: string) =>
    request<{
      roundId: string;
      result: 'JACKPOT' | 'SMALL_WIN' | 'BAD_EXPLODE' | 'MISS';
      winAmount: number;
      balance: number;
    }>('/game/shoot', {
      method: 'POST',
      body: JSON.stringify({ betAmount, currentMultiplier, pinataHits, roundId }),
    }),

  // Records
  getHistory: (page = 1, limit = 50) =>
    request<{
      records: Array<{
        id: string;
        roundId: string;
        betAmount: number;
        multiplier: number;
        winAmount: number;
        balAfter: number;
        gamePhase: string;
        result: string;
        createdAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/records/history?page=${page}&limit=${limit}`),

  getStats: () =>
    request<{
      totalBets: number;
      totalWagered: number;
      totalWon: number;
      netProfit: number;
      jackpots: number;
      biggestWin: number;
      playerRTP: number;
    }>('/records/stats'),

  // Admin
  adminGetPlayers: (page = 1, search = '') =>
    request<{
      players: Array<PlayerInfo & { status: string; totalGames: number; createdAt: string }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/players?page=${page}&search=${search}`),

  adminGetPlayerDetail: (id: string) => request<unknown>(`/admin/players/${id}`),

  adminUpdateBalance: (id: string, amount: number, reason?: string) =>
    request<unknown>(`/admin/players/${id}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ amount, reason }),
    }),

  adminGetReports: () => request<unknown>('/admin/reports'),

  adminGetGameConfig: () =>
    request<{ betList: number[]; rtp: number }>('/admin/game-config'),

  adminUpdateGameConfig: (betList?: number[], rtp?: number) =>
    request<{ betList: number[]; rtp: number }>('/admin/game-config', {
      method: 'PUT',
      body: JSON.stringify({ betList, rtp }),
    }),
};
