/**
 * MathModel - 伺服器端遊戲數學模組
 * 所有隨機結果由伺服器產生，確保公平性
 */
export class MathModel {
  private targetRTP: number;
  private cyclePhase: number;
  private spinCount: number;

  constructor(targetRTP: number = 0.96) {
    this.targetRTP = targetRTP;
    this.cyclePhase = Math.random() * Math.PI * 2;
    this.spinCount = 0;
  }

  /**
   * 起飛結果判定 (Base Game)
   */
  getLaunchResult(betAmount: number): { isWin: boolean; winAmount: number; multiplier: number } {
    const hitRate = 0.40;
    const isWin = Math.random() < hitRate;
    let winAmount = 0;
    let multiplier = 0;

    if (isWin) {
      const rand = Math.random();
      if (rand < 0.5) multiplier = 1.5;
      else if (rand < 0.8) multiplier = 2.0;
      else if (rand < 0.95) multiplier = 3.0;
      else multiplier = 5.0;

      winAmount = betAmount * multiplier;
    }

    return { isWin, winAmount, multiplier };
  }

  /**
   * 射擊結果判定 (Sky Game)
   */
  getShootResult(
    currentMultiplier: number,
    pinataHits: number
  ): { result: 'JACKPOT' | 'SMALL_WIN' | 'BAD_EXPLODE' | 'MISS'; smallWinAmount?: number } {
    this.spinCount++;
    this.cyclePhase += 0.2;
    const luckFactor = 1.0 + Math.sin(this.cyclePhase) * 0.2;

    let smallWinChance = 0.45 * luckFactor;
    const jackpotRTPContribution = this.targetRTP - (smallWinChance * 0.5);
    let jackpotChance = jackpotRTPContribution / currentMultiplier;
    jackpotChance = Math.max(0.000001, Math.min(0.5, jackpotChance));
    jackpotChance *= luckFactor;

    let baseRisk = 0.02;
    if (currentMultiplier >= 50) baseRisk = 0.04;
    const explodeRisk = baseRisk + (pinataHits * 0.015);

    const roll = Math.random();
    if (roll < jackpotChance) {
      return { result: 'JACKPOT' };
    }

    const subRoll = Math.random();
    if (subRoll < (explodeRisk / luckFactor)) {
      return { result: 'BAD_EXPLODE' };
    }
    if (subRoll < smallWinChance) {
      return { result: 'SMALL_WIN' };
    }
    return { result: 'MISS' };
  }

  /**
   * 計算小獎金額
   */
  getSmallWinAmount(betAmount: number): number {
    if (Math.random() < 0.1) return Math.floor(betAmount * 1.5 * 100) / 100;
    return Math.floor(betAmount * (0.2 + Math.random() * 0.6) * 100) / 100;
  }

  setRTP(rtp: number): void {
    this.targetRTP = rtp;
  }
}

// 單例 - 每個玩家 session 理論上應該獨立，但簡化處理用單一實例
export const mathModel = new MathModel();
