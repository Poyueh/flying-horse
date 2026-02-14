import { AudioController } from './AudioController';

// ============================================
// Type Definitions
// ============================================
interface Spring {
  x: number; y: number; w: number; h: number;
  mul: number; color: string; textColor: string; label: string;
  glow: boolean; active: boolean; pulse: number; compress: number;
}
interface RoadmapItem {
  mul: number; color: string; textColor: string; label: string; glow: boolean; weight?: number;
}
interface Bullet {
  x: number; y: number; targetX: number; targetY: number;
  speed: number; isLast: boolean; betAmount: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; type: string;
  size: number; gravity: number; rotation: number; rotSpeed: number;
  growth: number; w?: number; h?: number;
}
interface TextEffect {
  str: string; x: number; y: number; color: string; size: number;
  type: string; vy: number; life: number; maxLife: number;
  currentSize: number; pulse?: number; rotation?: number;
}
interface Cloud { x: number; y: number; speed: number; size: number; alpha: number; }
interface HorseState {
  x: number; y: number; vy: number; angle: number;
  state: 'RUN' | 'FLY' | 'SPIN';
  spinTimer: number; scale: number;
  targetX: number; targetY: number; moveTimer: number;
  pinataHits: number; wobble: number;
  animScaleX: number; animScaleY: number;
  scaleVx: number; scaleVy: number;
  faceTimer: number; tongueOut: number; buttWiggle: number;
}
type GameState = 'GROUND' | 'LAUNCHING' | 'SKY' | 'EXPLODING' | 'FALLING';

export interface GameCallbacks {
  onLaunch: (springMul: number) => void;
  onShoot: () => void;
  onBetChange: (amount: number) => void;
  onBetAdjust: (delta: number) => void;
  onShowHistory: () => void;
  onShowAdmin: () => void;
  onLogout: () => void;
}

const I18N: Record<string, Record<string, string>> = {
  en: {
    reloading: 'RELOADING', tapToStart: 'TAP ANYWHERE TO START',
    noMoney: 'NO MONEY!', legendary: 'LEGENDARY!', boost: 'BOOST!',
    misfire: 'JAM!', jammed: 'WARNING!', miss: 'MISS', streakLost: 'STREAK LOST',
    clink: 'CLINK!', broken: 'BROKEN!', streak: 'STREAK', bigWin: 'BIG WIN',
    rounds: 'Rounds', minMul: 'Target Range', music: 'Music', sound: 'Sound',
    language: 'Language', betAmount: 'Bet Amount', historyReport: 'History Report',
    balanceTitle: 'BALANCE', colSerial: 'Serial', colTime: 'Time', colMul: 'Mul',
    colBet: 'Bet', colWin: 'Win', colBal: 'Balance',
  },
  zh: {
    reloading: '装填中', tapToStart: '点击任意处开始',
    noMoney: '余额不足!', legendary: '传奇!', boost: '爆发!',
    misfire: '炸裂!', jammed: '警告!', miss: '未命中', streakLost: '连胜中断',
    clink: '叮当!', broken: '击碎!', streak: '连胜', bigWin: '大奖',
    rounds: '局数', minMul: '目标范围', music: '音乐', sound: '音效',
    language: '语言', betAmount: '押注额', historyReport: '历史报表',
    balanceTitle: '余额', colSerial: '序号', colTime: '时间', colMul: '倍数',
    colBet: '押注', colWin: '赢分', colBal: '余额',
  },
};

const MULTIPLIER_TYPES: RoadmapItem[] = [
  { mul: 2, color: '#22c55e', label: 'x2', weight: 400, textColor: '#fff', glow: false },
  { mul: 5, color: '#fbbf24', label: 'x5', weight: 300, textColor: '#000', glow: false },
  { mul: 10, color: '#f97316', label: 'x10', weight: 150, textColor: '#fff', glow: false },
  { mul: 25, color: '#ef4444', label: 'x25', weight: 80, textColor: '#fff', glow: false },
  { mul: 50, color: '#db2777', label: 'x50', weight: 40, textColor: '#fff', glow: false },
  { mul: 100, color: '#9333ea', label: 'x100', weight: 20, textColor: '#fff', glow: true },
  { mul: 500, color: '#2563eb', label: 'x500', weight: 8, textColor: '#fff', glow: true },
  { mul: 1000, color: '#ffffff', label: 'x1K', weight: 6, textColor: '#000', glow: true },
  { mul: 10000, color: '#00ffff', label: 'MAX', weight: 2, textColor: '#000', glow: true },
];

// ============================================
// GameEngine Class
// ============================================
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private audio: AudioController;
  private callbacks: GameCallbacks;

  // Config (from server)
  private betList: number[] = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  private mulSteps: number[] = [2, 5, 10, 25, 50, 100, 200, 500, 1000, 10000];

  // State
  private lang = 'en';
  private state: GameState = 'GROUND';
  private balance = 5000;
  private betIndex = 4;
  private betAmount = 1.0;
  private currentMultiplier = 1;
  private winStreak = 0;
  private gameTick = 0;

  // Dimensions
  private width = 900;
  private height = 1600;
  private groundLevel = 0;
  private horseBaseY = 0;

  // Game objects
  private horse: HorseState;
  private springs: Spring[] = [];
  private springSpawnTimer = 0;
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private texts: TextEffect[] = [];
  private clouds: Cloud[] = [];
  private roadmapFuture: RoadmapItem[] = [];
  private roadmapPast: RoadmapItem[] = [];

  // Shooting
  private isFiring = false;
  private fireQueue = 0;
  private fireTimer = 0;
  private pendingServerResult: { result: string; winAmount: number; balance: number } | null = null;
  private waitingForServer = false;

  // Sky
  private skyDurationMax = 300;
  private skyTimer = 0;
  private hitCooldownMax = 60;
  private hitCooldown = 0;

  // Camera
  private camera = { y: 0, shake: 0 };
  private flashAlpha = 0;
  private bgScroll = 0;
  private groundSpeed = 12;

  // Auto
  private auto = { active: false, rounds: 10, maxRounds: 10, minMul: 2, maxMul: 10000 };
  private autoDelay = 0;

  // Explosion
  private explosionTimer = 0;

  // UI timers
  private betAdjustTimeout: ReturnType<typeof setTimeout> | null = null;
  private betAdjustInterval: ReturnType<typeof setInterval> | null = null;
  private isMenuOpen = false;

  // Frame
  private fps = 60;
  private frameInterval = 1000 / 60;
  private lastFrameTime = 0;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.audio = new AudioController();

    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.wrapper = document.getElementById('game-wrapper')!;

    this.horse = {
      x: 0, y: 0, vy: 0, angle: 0, state: 'RUN',
      spinTimer: 0, scale: 2.2, targetX: 0, targetY: 0, moveTimer: 0,
      pinataHits: 0, wobble: 0, animScaleX: 1, animScaleY: 1,
      scaleVx: 0, scaleVy: 0, faceTimer: 0, tongueOut: 0, buttWiggle: 0,
    };

    // Generate roadmap
    for (let i = 0; i < 20; i++) this.roadmapFuture.push(this.generateWeightedMultiplier());
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * 900, y: Math.random() * 800,
        speed: 1 + Math.random() * 2, size: 50 + Math.random() * 80,
        alpha: 0.2 + Math.random() * 0.3,
      });
    }

    this.setupUI();
    this.setupEvents();
    this.resize();
    this.updateUI();
    this.updateRoadmapUI();

    this.loop(0);
    setTimeout(() => { this.wrapper.style.opacity = '1'; }, 100);
  }

  // ============================================
  // Public API (called by GameMediator)
  // ============================================

  setConfig(betList: number[], mulSteps: number[]): void {
    this.betList = betList;
    this.mulSteps = mulSteps;
    const idx = betList.indexOf(1.0);
    this.betIndex = idx !== -1 ? idx : Math.min(4, betList.length - 1);
    this.betAmount = betList[this.betIndex];
    this.rebuildBetChips();
    this.updateUI();
  }

  updateBalance(balance: number): void {
    this.balance = balance;
    this.updateUI();
  }

  updateBetDisplay(amount: number): void {
    this.betAmount = amount;
    const idx = this.betList.indexOf(amount);
    if (idx !== -1) this.betIndex = idx;
    this.highlightChip();
    this.updateUI();
  }

  handleLaunchResult(result: { isWin: boolean; winAmount: number; balance: number; roundId: string }): void {
    this.waitingForServer = false;
    const spring = this.springs.find(s => !s.active === false) || this.springs[0];
    if (!spring) return;

    this.balance = result.balance;

    // Clear other springs
    const pendingSprings = this.springs.filter(s => s.x > spring.x);
    for (const s of pendingSprings) {
      this.roadmapFuture.unshift({ mul: s.mul, color: s.color, textColor: s.textColor, label: s.label, glow: s.glow });
      this.roadmapPast.pop();
    }
    this.springs = [spring];
    this.updateRoadmapUI();

    if (result.isWin) {
      this.audio.playJump();
      this.audio.playSmallWin();
      this.createParticles(spring.x, spring.y + 10, 1, 'rgba(255,255,255,0.8)', 'shockwave');
      this.createParticles(spring.x, spring.y, 20, spring.color, 'spark');
      this.createParticles(spring.x, spring.y, 10, '#fbbf24', 'coin');
      const label = spring.mul >= 1000 ? I18N[this.lang].legendary : `x${spring.mul} ${I18N[this.lang].boost}`;
      this.spawnText(label, this.width / 2, this.height / 2, spring.color, 100);
      this.spawnText(`+${this.formatCurrency(result.winAmount)}`, this.width / 2, this.height / 2 - 80, '#fbbf24', 60);
    } else {
      this.audio.playLaunchFail();
      this.shakeScreen(30);
      this.createParticles(spring.x, spring.y, 40, '#4b5563', 'smoke');
      this.createParticles(spring.x, spring.y, 10, '#ef4444', 'spark');
      this.spawnText(I18N[this.lang].jammed, this.width / 2, this.height / 2, '#ef4444', 80);
      this.horse.wobble = 20;
    }

    spring.active = false;
    spring.compress = 20;

    // Fly
    setTimeout(() => {
      this.state = 'LAUNCHING';
      this.currentMultiplier = spring.mul;
      this.horse.vy = -22;
      this.horse.state = 'FLY';
      this.skyTimer = this.skyDurationMax;
      this.horse.targetX = this.width * 0.3;
      this.horse.moveTimer = 0;
      this.horse.pinataHits = 0;
      this.horse.animScaleX = 1;
      this.horse.animScaleY = 1;
      this.horse.scaleVx = 0;
      this.horse.scaleVy = 0;

      for (let i = 0; i < 30; i++) {
        this.particles.push({
          type: 'line', x: this.width + Math.random() * 200,
          y: this.horse.y + (Math.random() - 0.5) * 300,
          vx: -30 - Math.random() * 30, vy: 0, life: 45, maxLife: 45,
          color: result.isWin ? 'white' : '#ef4444', size: 4, gravity: 0,
          rotation: 0, rotSpeed: 0, growth: 0, w: 100, h: 4,
        });
      }
      this.springSpawnTimer = -30;
    }, 50);

    this.updateUI();
  }

  handleShootResult(result: { result: string; winAmount: number; balance: number }): void {
    this.pendingServerResult = result;
    this.balance = result.balance;
  }

  // ============================================
  // UI Setup
  // ============================================

  private setupUI(): void {
    this.initRevolverUI();
    this.initAutoSlider();
    this.setBetUI(this.betAmount);

    // Settings toggles
    const toggleMusic = document.getElementById('toggleMusic') as HTMLInputElement;
    const toggleSound = document.getElementById('toggleSound') as HTMLInputElement;
    if (toggleMusic) toggleMusic.checked = this.audio.musicEnabled;
    if (toggleSound) toggleSound.checked = this.audio.sfxEnabled;

    this.setLanguage('en');
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));

    try { this.audio.init(); } catch (e) { console.log(e); }

    const resumeAudio = (): void => {
      if (this.audio) this.audio.init();
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);

    this.canvas.addEventListener('pointerdown', (e) => this.handleInput(e));

    // Wire up UI buttons via global functions
    (window as unknown as Record<string, unknown>).gameEngine = this;
  }

  private rebuildBetChips(): void {
    const chipGrid = document.getElementById('chip-grid');
    if (!chipGrid) return;

    // Show 5 representative chips from the betList
    const chips = this.pickRepresentativeChips();
    const colors = ['#34d399', '#eab308', '#3b82f6', '#ef4444', '#a855f7'];
    const sizes = ['w-5 h-5', 'w-6 h-6', 'w-7 h-7', 'w-8 h-8', 'w-9 h-9'];
    const shadows = ['#34d399', '#eab308', '#3b82f6', '#ef4444', '#a855f7'];

    chipGrid.innerHTML = chips.map((amount, i) => `
      <button onclick="gameEngine.onChipClick(${amount})" class="neon-btn aspect-square rounded-2xl bg-gray-800 border-2 border-gray-600 text-white font-bold flex flex-col items-center justify-center hover:bg-gray-700 active:bg-gray-900 shadow-lg group pointer-events-auto" data-bet="${amount}">
        <div class="${sizes[i]} rounded-full mb-1 shadow-[0_0_10px_${shadows[i]}] group-hover:scale-110 transition-transform pointer-events-none" style="background:${colors[i]}"></div>
        <span class="ui-font text-lg pointer-events-none">${amount >= 1 ? amount : amount.toFixed(1)}</span>
      </button>
    `).join('');

    this.highlightChip();
  }

  private pickRepresentativeChips(): number[] {
    const list = this.betList;
    if (list.length <= 5) return [...list];
    const indices = [0, Math.floor(list.length * 0.25), Math.floor(list.length * 0.5), Math.floor(list.length * 0.75), list.length - 1];
    return [...new Set(indices.map(i => list[i]))].slice(0, 5);
  }

  private highlightChip(): void {
    document.querySelectorAll('.neon-btn').forEach(btn => {
      const val = parseFloat((btn as HTMLElement).dataset.bet || '0');
      if (Math.abs(val - this.betAmount) < 0.001) btn.classList.add('selected');
      else btn.classList.remove('selected');
    });
  }

  // Public methods called from HTML onclick
  onChipClick(amount: number): void {
    if (this.hitCooldown > 0 || this.isFiring) return;
    this.callbacks.onBetChange(amount);
  }

  onBetAdjustStart(delta: number): void {
    if (this.hitCooldown > 0 || this.isFiring) return;
    this.callbacks.onBetAdjust(delta);
    this.stopBetAdjust();
    this.betAdjustTimeout = setTimeout(() => {
      this.betAdjustInterval = setInterval(() => this.callbacks.onBetAdjust(delta), 50);
    }, 400);
  }

  onBetAdjustStop(): void { this.stopBetAdjust(); }

  private stopBetAdjust(): void {
    if (this.betAdjustTimeout) clearTimeout(this.betAdjustTimeout);
    if (this.betAdjustInterval) clearInterval(this.betAdjustInterval);
    this.betAdjustTimeout = null;
    this.betAdjustInterval = null;
  }

  onToggleAutoPanel(show: boolean): void {
    if (show && this.auto.active) { this.stopAuto(); return; }
    const panel = document.getElementById('autoPanel')!;
    const content = document.getElementById('autoPanelContent')!;
    if (show) {
      panel.style.pointerEvents = 'auto'; panel.style.opacity = '1'; content.style.transform = 'scale(1)';
      this.updateAutoPanelUI(); this.updateAutoSliderUI();
    } else {
      panel.style.opacity = '0'; panel.style.pointerEvents = 'none'; content.style.transform = 'scale(0.9)';
    }
  }

  onSetAutoRounds(val: number): void { this.auto.maxRounds = val; this.updateAutoPanelUI(); }

  onStartAuto(): void {
    this.auto.active = true;
    this.auto.rounds = this.auto.maxRounds;
    this.onToggleAutoPanel(false);
    this.updateAutoStatusBtn();
  }

  private stopAuto(): void {
    this.auto.active = false;
    this.updateAutoStatusBtn();
  }

  onToggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    const menu = document.getElementById('sideMenu')!;
    if (this.isMenuOpen) {
      menu.style.transform = 'scale(1)'; menu.style.opacity = '1'; menu.style.pointerEvents = 'auto';
    } else {
      menu.style.transform = 'scale(0)'; menu.style.opacity = '0'; menu.style.pointerEvents = 'none';
    }
  }

  onToggleSettings(show: boolean): void {
    const modal = document.getElementById('settingsModal')!;
    if (show) { modal.style.pointerEvents = 'auto'; modal.style.opacity = '1'; }
    else { modal.style.opacity = '0'; modal.style.pointerEvents = 'none'; }
  }

  onToggleHelp(show: boolean): void {
    const modal = document.getElementById('helpModal')!;
    if (show) { modal.style.pointerEvents = 'auto'; modal.style.opacity = '1'; }
    else { modal.style.opacity = '0'; modal.style.pointerEvents = 'none'; }
  }

  onToggleHistory(): void { this.callbacks.onShowHistory(); }
  onShowAdmin(): void { this.callbacks.onShowAdmin(); }
  onLogout(): void { this.callbacks.onLogout(); }

  onToggleMusic(val: boolean): void { this.audio.musicEnabled = val; }
  onToggleSound(val: boolean): void { this.audio.sfxEnabled = val; }

  setLanguage(lang: string): void {
    this.lang = lang;
    const t = I18N[this.lang];
    const setTxt = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.innerText = text;
    };
    const setHtml = (id: string, html: string) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };
    setTxt('lblReloading', t.reloading);
    setTxt('startHint', t.tapToStart);
    setTxt('lblMusic', t.music);
    setTxt('lblSound', t.sound);
    setTxt('lblLang', t.language);
    setTxt('lblAutoRounds', t.rounds);
    setTxt('lblAutoRange', t.minMul);
    setTxt('lblBetAmount', t.betAmount);
    setTxt('lblBalanceTitle', t.balanceTitle);

    // Update help (simplified - just set key text)
    setHtml('helpGoalTitle', `🎯 ${lang === 'zh' ? '游戏目标' : 'Game Goal'}`);
    setHtml('helpGoalDesc', lang === 'zh'
      ? '您的任務是駕駛飛天神駒直衝雲霄！觀察路途預測，在最佳時機彈射起飛，並在空中擊碎彩馬贏取巨額倍數獎金。'
      : 'Your mission is to ride the Flying Horse to the skies! Observe the roadmap, time your launch perfectly, and destroy the Pinata to claim massive rewards.');
    setTxt('btnGotIt', lang === 'zh' ? '好的，我知道了！' : 'OK, I GOT IT!');

    this.updateUI();
  }

  // ============================================
  // Input Handling
  // ============================================

  private handleInput(e: PointerEvent): void {
    e.preventDefault();
    this.audio.init();

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (x < 0 || x > this.width || y < 0 || y > this.height) return;

    if (this.state === 'GROUND') {
      const target = this.getTargetSpring();
      if (target && !this.waitingForServer) {
        this.waitingForServer = true;
        target.compress = 20;
        this.callbacks.onLaunch(target.mul);
      }
    } else if (this.state === 'SKY') {
      if (this.hitCooldown > 0 || this.isFiring || this.waitingForServer) return;
      if (this.balance >= this.betAmount) {
        this.startShootingRound();
      } else {
        this.spawnText(I18N[this.lang].noMoney, this.horse.x, this.horse.y, '#ef4444', 50);
      }
    }
  }

  // ============================================
  // Game Mechanics
  // ============================================

  private startShootingRound(): void {
    this.waitingForServer = true;
    this.callbacks.onShoot();
    this.isFiring = true;
    this.fireQueue = 6;
    this.fireTimer = 0;
  }

  private spawnBullet(): void {
    this.audio.playShoot();
    this.bullets.push({
      x: this.width / 2 + (Math.random() - 0.5) * 100,
      y: this.height + 20,
      targetX: this.horse.x, targetY: this.horse.y,
      speed: 45, isLast: this.fireQueue === 1, betAmount: this.betAmount,
    });
    this.fireQueue--;
  }

  private bulletHit(b: Bullet): void {
    this.horse.pinataHits++;
    this.horse.animScaleX = 1.3;
    this.horse.animScaleY = 0.7;
    this.horse.scaleVx = (Math.random() - 0.5) * 0.3;
    this.horse.scaleVy = 0.2;
    this.horse.faceTimer = 20;
    this.shakeScreen(15);
    this.audio.playHit();
    this.createParticles(this.horse.x, this.horse.y, 20, '#fff', 'spark');

    if (b.isLast) {
      this.isFiring = false;
      this.hitCooldown = this.auto.active ? 30 : this.hitCooldownMax;
      this.audio.playReload();
      this.skyTimer = this.skyDurationMax;

      // Process server result
      if (this.pendingServerResult) {
        this.processShootResult(this.pendingServerResult);
        this.pendingServerResult = null;
        this.waitingForServer = false;
      }
      this.updateUI();
    }
  }

  private processShootResult(result: { result: string; winAmount: number; balance: number }): void {
    this.balance = result.balance;

    switch (result.result) {
      case 'JACKPOT':
        setTimeout(() => this.explodePinata(true, result.winAmount), 200);
        break;
      case 'SMALL_WIN':
        if (result.winAmount > 0) {
          this.spawnText(`+${this.formatCurrency(result.winAmount)}`, this.horse.x + (Math.random() - 0.5) * 40, this.horse.y - 60, '#fff', 70);
          this.createParticles(this.horse.x, this.horse.y, 5, '#fef08a', 'coin');
          this.audio.playSmallWin();
        } else {
          this.spawnText(I18N[this.lang].clink, this.horse.x, this.horse.y - 60, '#fff', 30);
        }
        break;
      case 'BAD_EXPLODE':
        setTimeout(() => this.explodePinata(false, 0), 200);
        this.spawnText(I18N[this.lang].misfire, this.horse.x, this.horse.y - 80, '#7f1d1d', 50);
        break;
      default: // MISS
        this.spawnText(I18N[this.lang].miss, this.horse.x, this.horse.y - 80, '#9ca3af', 40);
        if (this.winStreak >= 3) {
          this.spawnText(I18N[this.lang].streakLost, this.horse.x, this.horse.y + 50, '#ef4444', 40);
        }
        this.winStreak = 0;
        break;
    }
  }

  private explodePinata(isWin: boolean, winAmount: number): void {
    this.audio.playExplode();

    if (isWin) {
      this.state = 'EXPLODING';
      this.explosionTimer = this.auto.active ? 60 : 120;
      this.horse.vy = 0;
      this.shakeScreen(100);
      this.flashAlpha = 1.0;
      this.audio.playWin();
      this.winStreak++;

      const cx = this.width / 2;
      const cy = this.height * 0.4;
      this.spawnText(I18N[this.lang].bigWin, cx, cy - 80, '#FFD700', 100);
      this.spawnText(`+${this.formatCurrency(winAmount)}`, cx, cy, '#FFD700', 130, 'BIG_WIN');
      this.createParticles(this.horse.x, this.horse.y, 150, '#ec4899', 'confetti');
      this.createParticles(this.horse.x, this.horse.y, 80, '#FACC15', 'coin');
    } else {
      this.state = 'FALLING';
      this.horse.vy = 0;
      this.shakeScreen(40);
      this.flashAlpha = 0.3;
      this.winStreak = 0;
      this.spawnText(I18N[this.lang].broken, this.horse.x, this.horse.y - 50, '#ef4444', 70);
      this.createParticles(this.horse.x, this.horse.y, 50, '#4b5563', 'spark');
      this.createParticles(this.horse.x, this.horse.y, 30, '#ef4444', 'line');
    }
    this.updateUI();
  }

  // ============================================
  // Helpers
  // ============================================

  private generateWeightedMultiplier(): RoadmapItem {
    const totalWeight = MULTIPLIER_TYPES.reduce((sum, t) => sum + (t.weight || 0), 0);
    let rand = Math.random() * totalWeight;
    for (const t of MULTIPLIER_TYPES) {
      if (rand < (t.weight || 0)) return { ...t };
      rand -= (t.weight || 0);
    }
    return { ...MULTIPLIER_TYPES[0] };
  }

  private getSpringColor(mul: number): string {
    if (mul >= 10000) return '#00ffff';
    if (mul >= 1000) return '#ffffff';
    if (mul >= 500) return '#2563eb';
    if (mul >= 100) return '#9333ea';
    if (mul >= 50) return '#db2777';
    if (mul >= 25) return '#ef4444';
    if (mul >= 10) return '#f97316';
    if (mul >= 5) return '#fbbf24';
    return '#22c55e';
  }

  private getTargetSpring(): Spring | undefined {
    return this.springs.find(s => s.x > 180 && s.active);
  }

  private formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private spawnText(str: string, x: number, y: number, color: string, size = 32, type = 'normal'): void {
    this.texts.push({ str, x, y, color, size, type, vy: -4, life: 60, maxLife: 60, currentSize: size });
  }

  private shakeScreen(intensity: number): void {
    this.camera.shake = Math.max(this.camera.shake, intensity);
  }

  private createParticles(x: number, y: number, count: number, color: string, type = 'spark'): void {
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 30 + Math.random() * 20, maxLife: 30 + Math.random() * 20,
        color, type, size: Math.random() * 8 + 4, gravity: 0.6,
        rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10, growth: 0,
      };
      if (type === 'coin') { p.vx = (Math.random() - 0.5) * 25; p.vy = -25 - Math.random() * 20; p.gravity = 1.2; p.life = 70; p.size = 14; }
      else if (type === 'smoke') { p.vx = (Math.random() - 0.5) * 5; p.vy = -Math.random() * 5 - 2; p.gravity = -0.1; p.life = 60; p.maxLife = 60; p.size = Math.random() * 20 + 10; p.growth = 0.5; }
      else if (type === 'shockwave') { p.vx = 0; p.vy = 0; p.gravity = 0; p.life = 20; p.maxLife = 20; p.size = 10; p.growth = 20; }
      else if (type === 'confetti') { p.w = 8 + Math.random() * 8; p.h = 4 + Math.random() * 4; }
      else if (type === 'line') { p.w = 100; p.h = 4; }
      this.particles.push(p);
    }
  }

  private spawnSpring(): void {
    const selected = this.roadmapFuture.shift()!;
    this.springs.push({
      x: this.width + 150, y: this.groundLevel + 20,
      w: 120, h: 70, mul: selected.mul, color: selected.color,
      textColor: selected.textColor, label: selected.label,
      glow: selected.glow, active: true, pulse: 0, compress: 0,
    });
    this.roadmapPast.push(selected);
    this.roadmapFuture.push(this.generateWeightedMultiplier());
    this.updateRoadmapUI();
  }

  // ============================================
  // UI Updates
  // ============================================

  private setBetUI(amount: number): void {
    this.betAmount = amount;
    this.highlightChip();
    this.updateUI();
  }

  private updateUI(): void {
    const balEl = document.getElementById('balanceDisplay');
    if (balEl) balEl.innerText = this.formatCurrency(this.balance);

    let displayMul = this.currentMultiplier;
    let displayColor = '#60a5fa';
    if (this.state === 'GROUND') {
      const target = this.getTargetSpring();
      if (target) { displayMul = target.mul; displayColor = target.color; }
      else if (this.roadmapFuture.length > 0) { displayMul = this.roadmapFuture[0].mul; displayColor = this.roadmapFuture[0].color; }
    } else { displayColor = this.getSpringColor(this.currentMultiplier); }

    const mulDisplay = document.getElementById('multiplierDisplay');
    if (mulDisplay) { mulDisplay.innerText = 'x' + displayMul; mulDisplay.style.color = displayColor; }

    const betDisplay = document.getElementById('currentBetDisplay');
    if (betDisplay) betDisplay.innerText = this.formatCurrency(this.betAmount);

    // Sky/Ground UI visibility
    const skyHUD = document.getElementById('skyHUD');
    const groundControls = document.getElementById('groundControls');
    const hitUI = document.getElementById('hitCooldownUI');
    const betPanel = document.getElementById('betPanel');

    if (this.state === 'SKY' || this.state === 'LAUNCHING') {
      if (skyHUD) skyHUD.style.opacity = '1';
      if (groundControls) groundControls.style.opacity = '0';
      if (hitUI) hitUI.style.opacity = '1';
      const pct = (this.skyTimer / this.skyDurationMax) * 100;
      const bar = document.getElementById('skyTimerBar');
      if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';

      // Revolver UI
      this.updateRevolverUI();
    } else {
      if (skyHUD) skyHUD.style.opacity = '0';
      if (groundControls) groundControls.style.opacity = '1';
      if (hitUI) hitUI.style.opacity = '0';
      if (betPanel) betPanel.classList.remove('processing');
    }
  }

  private updateRevolverUI(): void {
    const revolverContainer = document.getElementById('revolverContainer');
    const ammoIconDiv = document.getElementById('ammoIcon');
    const betPanel = document.getElementById('betPanel');
    const reloadHintBar = document.getElementById('reloadHintBar');
    if (!revolverContainer) return;

    let bulletsLoaded = 6;
    let rotation = 0;

    if (this.hitCooldown > 0) {
      const progress = 1 - (this.hitCooldown / this.hitCooldownMax);
      bulletsLoaded = Math.floor(progress * 6);
      rotation = bulletsLoaded * 60;
      if (ammoIconDiv) ammoIconDiv.innerHTML = '';
      if (betPanel) betPanel.classList.add('processing');
      if (reloadHintBar) { reloadHintBar.style.opacity = '1'; reloadHintBar.style.transform = 'translateY(0)'; }
    } else if (this.isFiring) {
      bulletsLoaded = 0;
      rotation = this.gameTick * 30;
      if (ammoIconDiv) ammoIconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>';
      if (betPanel) betPanel.classList.add('processing');
      if (reloadHintBar) { reloadHintBar.style.opacity = '0'; reloadHintBar.style.transform = 'translateY(1rem)'; }
    } else {
      if (ammoIconDiv) ammoIconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
      if (betPanel) betPanel.classList.remove('processing');
      if (reloadHintBar) { reloadHintBar.style.opacity = '0'; reloadHintBar.style.transform = 'translateY(1rem)'; }
    }

    revolverContainer.style.transform = `rotate(${rotation}deg)`;
    for (let i = 0; i < 6; i++) {
      const bullet = document.getElementById(`bullet-slot-${i}`);
      if (bullet) {
        bullet.classList.toggle('scale-0', i >= bulletsLoaded);
        bullet.classList.toggle('scale-100', i < bulletsLoaded);
      }
    }
  }

  private updateRoadmapUI(): void {
    const pastContainer = document.getElementById('roadmapPast');
    const futureContainer = document.getElementById('roadmapFuture');
    if (!pastContainer || !futureContainer) return;

    const showPast = this.roadmapPast.slice(-5);
    pastContainer.innerHTML = showPast.map(item => `
      <div class="roadmap-item w-9 h-9 rounded flex items-center justify-center text-xs font-bold border border-white/20" style="background-color:${item.color};color:${item.textColor}">
        ${item.mul >= 1000 ? 'K' : item.mul}
      </div>`).join('');

    const activeSprings = this.springs.filter(s => s.x > 180);
    const combined = [...activeSprings.map(s => ({ mul: s.mul, color: s.color, textColor: s.textColor, label: s.label, glow: s.glow })), ...this.roadmapFuture];
    const showFuture = combined.slice(0, 10);

    futureContainer.innerHTML = showFuture.map((item, index) => {
      const sizeClass = index === 0 ? 'w-12 h-12 text-xl border-2 border-white animate-pulse' : 'w-9 h-9 text-xs opacity-80';
      const label = item.mul >= 1000 ? (item.mul === 10000 ? 'MAX' : '1K') : item.mul;
      return `<div class="roadmap-item rounded-lg flex items-center justify-center font-black shadow-md ${sizeClass}" style="background-color:${item.color};color:${item.textColor}">${label}</div>`;
    }).join('');
  }

  private initRevolverUI(): void {
    const container = document.getElementById('revolverContainer');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'absolute top-0 left-0 w-full h-full pointer-events-none';
      slot.style.transform = `rotate(${i * 60}deg)`;
      slot.innerHTML = `<div class="absolute left-1/2 -translate-x-1/2 top-2 w-8 h-8 rounded-full bg-gray-950 border border-gray-700 flex items-center justify-center shadow-inner overflow-hidden">
        <div id="bullet-slot-${i}" class="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_5px_rgba(234,179,8,0.8)] scale-100 transition-transform duration-150"></div>
      </div>`;
      container.appendChild(slot);
    }
  }

  private initAutoSlider(): void {
    const rangeMin = document.getElementById('rangeMin') as HTMLInputElement;
    const rangeMax = document.getElementById('rangeMax') as HTMLInputElement;
    if (!rangeMin || !rangeMax) return;

    const updateSlider = (): void => {
      const min = parseInt(rangeMin.value);
      const max = parseInt(rangeMax.value);
      if (max < min) { rangeMax.value = rangeMin.value; }
      this.auto.minMul = this.mulSteps[parseInt(rangeMin.value)] || 2;
      this.auto.maxMul = this.mulSteps[parseInt(rangeMax.value)] || 10000;
      this.updateAutoSliderUI();
    };

    rangeMin.addEventListener('input', updateSlider);
    rangeMax.addEventListener('input', updateSlider);
  }

  private updateAutoSliderUI(): void {
    const rangeMin = document.getElementById('rangeMin') as HTMLInputElement;
    const rangeMax = document.getElementById('rangeMax') as HTMLInputElement;
    const highlight = document.getElementById('rangeHighlight');
    const lblVal = document.getElementById('lblAutoRangeVal');
    if (!rangeMin || !rangeMax || !highlight || !lblVal) return;

    const p1 = (parseInt(rangeMin.value) / 9) * 100;
    const p2 = (parseInt(rangeMax.value) / 9) * 100;
    highlight.style.left = `${p1}%`;
    highlight.style.width = `${p2 - p1}%`;

    const fmtMul = (m: number) => m >= 10000 ? 'MAX' : m >= 1000 ? '1K' : `x${m}`;
    lblVal.innerText = `${fmtMul(this.auto.minMul)} - ${fmtMul(this.auto.maxMul)}`;
  }

  private updateAutoPanelUI(): void {
    document.querySelectorAll('.auto-opt-btn').forEach(btn => {
      btn.classList.remove('selected');
      const type = (btn as HTMLElement).dataset.type;
      const val = parseInt((btn as HTMLElement).dataset.val || '0');
      if (type === 'rounds' && val === this.auto.maxRounds) btn.classList.add('selected');
    });
  }

  private updateAutoStatusBtn(): void {
    const badge = document.getElementById('autoActiveBadge');
    const defaultContent = document.getElementById('autoDefaultContent');
    const roundsSpan = document.getElementById('autoActiveRounds');
    const mulSpan = document.getElementById('autoActiveMul');
    const btn = document.getElementById('autoToggleBtn');
    if (!badge || !defaultContent || !btn) return;

    if (this.auto.active) {
      badge.classList.remove('hidden');
      defaultContent.classList.add('opacity-0');
      if (roundsSpan) roundsSpan.innerText = this.auto.rounds >= 9999 ? '∞' : String(this.auto.rounds);
      if (mulSpan) {
        const fmtMul = (m: number) => m >= 10000 ? 'MAX' : m >= 1000 ? '1K' : `x${m}`;
        mulSpan.innerText = this.auto.maxMul === 10000 ? `${fmtMul(this.auto.minMul)}+` : `${fmtMul(this.auto.minMul)}-${fmtMul(this.auto.maxMul)}`;
      }
      btn.classList.remove('border-blue-500/50');
      btn.classList.add('border-green-500', 'shadow-[0_0_15px_#22c55e]');
    } else {
      badge.classList.add('hidden');
      defaultContent.classList.remove('opacity-0');
      btn.classList.add('border-blue-500/50');
      btn.classList.remove('border-green-500', 'shadow-[0_0_15px_#22c55e]');
    }
  }

  // ============================================
  // Resize
  // ============================================

  private resize(): void {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isMobile = winH > winW;
    this.width = 900;

    if (isMobile) {
      const scale = winW / this.width;
      this.height = Math.ceil(winH / scale);
      this.wrapper.style.width = `${this.width}px`;
      this.wrapper.style.height = `${this.height}px`;
      this.wrapper.style.transformOrigin = '0 0';
      this.wrapper.style.transform = `scale(${scale})`;
      this.wrapper.style.left = '0px';
      this.wrapper.style.top = '0px';
      this.wrapper.style.borderRadius = '0px';
    } else {
      this.height = 1600;
      const scale = Math.min(winW / this.width, winH / this.height);
      this.wrapper.style.width = `${this.width}px`;
      this.wrapper.style.height = `${this.height}px`;
      this.wrapper.style.transformOrigin = 'center center';
      this.wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
      this.wrapper.style.left = '50%';
      this.wrapper.style.top = '50%';
      this.wrapper.style.borderRadius = '20px';
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.groundLevel = this.height - 680;
    this.horseBaseY = this.groundLevel - 70;

    if (this.state === 'GROUND') {
      this.horse.y = this.horseBaseY;
      this.horse.x = this.width * 0.3;
    }
  }

  // ============================================
  // Update Loop
  // ============================================

  private update(): void {
    this.gameTick++;

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.9;
      if (this.camera.shake < 0.5) this.camera.shake = 0;
    }

    if (this.state === 'GROUND') this.bgScroll += this.groundSpeed;
    if (this.hitCooldown > 0) { this.hitCooldown--; if (this.hitCooldown % 2 === 0) this.updateUI(); }

    // AUTO BOT
    if (this.auto.active) {
      if (this.state === 'GROUND') {
        const target = this.getTargetSpring();
        if (target && target.active && target.mul >= this.auto.minMul && target.mul <= this.auto.maxMul && !this.waitingForServer) {
          if (!this.autoDelay) this.autoDelay = Math.random() * 5;
          this.autoDelay--;
          if (this.autoDelay <= 0) {
            this.waitingForServer = true;
            target.compress = 20;
            this.callbacks.onLaunch(target.mul);
            this.autoDelay = 0;
          }
        }
      } else if (this.state === 'SKY' && !this.isFiring && this.hitCooldown === 0 && !this.waitingForServer) {
        if (this.balance >= this.betAmount) {
          this.startShootingRound();
          if (this.auto.rounds < 9999) {
            this.auto.rounds--;
            this.updateAutoStatusBtn();
            if (this.auto.rounds <= 0) this.stopAuto();
          }
        } else {
          this.stopAuto();
          this.spawnText(I18N[this.lang].noMoney, this.width / 2, this.height / 2, '#ef4444', 60);
        }
      }
    }

    // Horse physics (skip EXPLODING)
    if (this.state !== 'EXPLODING') {
      const stiffness = 0.2;
      const damping = 0.8;
      this.horse.scaleVx += (1 - this.horse.animScaleX) * stiffness;
      this.horse.scaleVx *= damping;
      this.horse.animScaleX += this.horse.scaleVx;
      this.horse.scaleVy += (1 - this.horse.animScaleY) * stiffness;
      this.horse.scaleVy *= damping;
      this.horse.animScaleY += this.horse.scaleVy;
    }

    if (this.horse.faceTimer > 0) this.horse.faceTimer--;

    // State machine
    if (this.state === 'GROUND') {
      this.horse.y = this.horseBaseY + Math.sin(this.gameTick * 0.2) * 6;
      this.horse.x = this.width * 0.3;
      this.springSpawnTimer++;
      if (this.springSpawnTimer > 22) { this.spawnSpring(); this.springSpawnTimer = -Math.random() * 10; }
      for (let i = this.springs.length - 1; i >= 0; i--) {
        const s = this.springs[i];
        s.x -= this.groundSpeed;
        if (s.compress > 0) s.compress *= 0.8;
        s.pulse = Math.sin(this.gameTick * 0.2) * 0.1 + 1;
        if (s.x < -200) this.springs.splice(i, 1);
      }
      if (this.gameTick % 15 === 0) { this.updateUI(); this.updateRoadmapUI(); }
    } else if (this.state === 'LAUNCHING') {
      const targetY = this.height * 0.3;
      this.horse.y += (targetY - this.horse.y) * 0.08;
      this.horse.x = this.width * 0.3;
      if (Math.abs(this.horse.y - targetY) < 20) this.state = 'SKY';
    } else if (this.state === 'SKY') {
      this.horse.moveTimer--;
      if (this.horse.moveTimer <= 0) {
        this.horse.targetX = this.width * 0.2 + Math.random() * (this.width * 0.6);
        this.horse.targetY = this.height * 0.15 + Math.random() * (this.height * 0.4);
        this.horse.moveTimer = 40 + Math.random() * 40;
      }
      this.horse.x += (this.horse.targetX - this.horse.x) * 0.05;
      this.horse.y += (this.horse.targetY - this.horse.y) * 0.05;
      if (this.horse.state === 'SPIN') {
        this.horse.angle += 0.4;
        this.horse.spinTimer--;
        if (this.horse.spinTimer <= 0) { this.horse.state = 'FLY'; this.horse.angle = 0; }
      } else {
        this.horse.wobble += 0.05;
        this.horse.angle = Math.sin(this.horse.wobble) * 0.1;
      }
      if (!this.isFiring && this.hitCooldown === 0) this.skyTimer--;
      this.updateUI();
      if (this.skyTimer <= 0) this.explodePinata(false, 0);
    } else if (this.state === 'FALLING') {
      this.horse.y += (this.horseBaseY - this.horse.y) * 0.06;
      this.horse.x += (this.width * 0.3 - this.horse.x) * 0.06;
      this.horse.angle += 0.2;
      if (Math.abs(this.horse.y - this.horseBaseY) < 20) {
        this.state = 'GROUND';
        this.currentMultiplier = 1;
        this.horse.y = this.horseBaseY;
        this.horse.state = 'RUN';
        this.horse.angle = 0;
        this.horse.x = this.width * 0.3;
        this.shakeScreen(15);
        this.createParticles(this.horse.x, this.horse.y + 80, 50, '#5c4033', 'spark');
        this.springs = [];
        this.springSpawnTimer = -20;
        this.updateUI();
      }
    } else if (this.state === 'EXPLODING') {
      this.explosionTimer--;
      this.shakeScreen(5);
      if (this.gameTick % 2 === 0) {
        this.createParticles(this.horse.x, this.horse.y, 2, '#FACC15', 'coin');
        this.createParticles(this.horse.x, this.horse.y, 1, '#fff', 'spark');
      }
      this.horse.angle += 0.5;
      this.horse.animScaleX = 1.5 + Math.sin(this.gameTick) * 0.2;
      this.horse.animScaleY = 1.5 + Math.cos(this.gameTick) * 0.2;
      if (this.explosionTimer <= 0) { this.state = 'FALLING'; this.horse.angle = 0; this.flashAlpha = 0.5; }
    }

    this.audio.setSkyMode(this.state === 'SKY' || this.state === 'LAUNCHING' || this.state === 'EXPLODING');

    // Clouds
    this.clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x < -200) {
        c.x = this.width + 200;
        c.y = this.state === 'SKY' ? Math.random() * this.height : Math.random() * (this.height * 0.4);
      }
    });

    // Shooting
    if (this.isFiring && this.fireQueue > 0) {
      this.fireTimer++;
      if (this.fireTimer >= 3) { this.spawnBullet(); this.fireTimer = 0; }
    }

    // Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const dx = this.horse.x - b.x;
      const dy = this.horse.y - b.y;
      const angle = Math.atan2(dy, dx);
      b.x += Math.cos(angle) * b.speed;
      b.y += Math.sin(angle) * b.speed;
      if (Math.sqrt(dx * dx + dy * dy) < 60) { this.bulletHit(b); this.bullets.splice(i, 1); }
      else if (b.y < -100 || b.x < -100 || b.x > this.width + 100) this.bullets.splice(i, 1);
    }

    this.updateParticles();
    this.updateTexts();
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.type === 'coin') { p.x += p.vx; p.y += p.vy; p.vy += p.gravity; }
      else if (p.type === 'smoke') { p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.size += p.growth; p.vx *= 0.95; if (this.state === 'GROUND' || this.state === 'LAUNCHING') p.x -= this.groundSpeed; }
      else if (p.type === 'shockwave') { p.size += p.growth; p.growth *= 0.9; }
      else if (p.type === 'line') { p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; }
      else if (p.type === 'confetti') { p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rotation += p.rotSpeed; p.vx *= 0.95; }
      else { p.x += p.vx; p.y += p.vy; p.vx *= 0.9; if (this.state === 'GROUND') p.x -= this.groundSpeed; }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateTexts(): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      if (t.type === 'BIG_WIN') {
        t.life -= 0.5;
        t.y += -0.5;
        if (!t.pulse) t.pulse = 0;
        t.pulse += 0.1;
        t.currentSize = t.size + Math.sin(t.pulse) * 10;
      } else {
        t.y += t.vy;
        t.life--;
        t.vy *= 0.92;
        t.currentSize = t.size;
        if (this.state === 'GROUND' && t.type !== 'comic') t.x -= 4;
      }
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  // ============================================
  // Draw
  // ============================================

  private draw(): void {
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);

    this.drawBackground();

    if (this.state === 'GROUND' || this.state === 'LAUNCHING' || this.state === 'FALLING') {
      this.drawGroundElements();
    }

    if (this.state === 'SKY' || this.state === 'EXPLODING') {
      this.drawPinata();
    } else {
      this.drawHorse();
    }

    // Bullets
    this.bullets.forEach(b => {
      this.ctx.save();
      this.ctx.translate(b.x, b.y);
      const dx = this.horse.x - b.x;
      const dy = this.horse.y - b.y;
      this.ctx.rotate(Math.atan2(dy, dx));
      this.ctx.fillStyle = '#e5e7eb';
      this.ctx.beginPath(); this.ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath(); this.ctx.moveTo(15, -7); this.ctx.lineTo(30, 0); this.ctx.lineTo(15, 7); this.ctx.fill();
      this.ctx.restore();
    });

    this.drawEffects();

    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.flashAlpha *= 0.85;
      if (this.flashAlpha < 0.01) this.flashAlpha = 0;
    }

    if ((this.state === 'SKY' || this.state === 'EXPLODING') && this.winStreak >= 2) {
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.ctx.font = '900 120px "Black Ops One"';
      this.ctx.translate(this.width / 2, this.height / 2 + 200);
      this.ctx.rotate(-0.1);
      this.ctx.fillText(I18N[this.lang].streak, 0, 50);
      this.ctx.fillText(`${this.winStreak}`, 0, -50);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawBackground(): void {
    const grd = this.ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.state === 'GROUND') { grd.addColorStop(0, '#1e40af'); grd.addColorStop(1, '#60a5fa'); }
    else if (this.state === 'SKY' || this.state === 'LAUNCHING' || this.state === 'EXPLODING') {
      if (this.currentMultiplier >= 1000) { grd.addColorStop(0, '#000000'); grd.addColorStop(1, '#2e1065'); }
      else if (this.currentMultiplier >= 50) { grd.addColorStop(0, '#451a03'); grd.addColorStop(1, '#b45309'); }
      else { grd.addColorStop(0, '#4a044e'); grd.addColorStop(1, '#c026d3'); }
    } else { grd.addColorStop(0, '#1d4ed8'); grd.addColorStop(1, '#93c5fd'); }
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Stars in sky mode
    if (this.state === 'SKY' || this.state === 'LAUNCHING' || this.state === 'EXPLODING') {
      this.ctx.fillStyle = 'white';
      for (let i = 0; i < 30; i++) {
        const sx = (this.gameTick * 2 + i * 137) % this.width;
        const sy = (i * 93) % this.height;
        this.ctx.globalAlpha = 0.5 + Math.sin(this.gameTick * 0.1 + i) * 0.5;
        this.ctx.fillRect(sx, sy, 3, 3);
      }
      this.ctx.globalAlpha = 1.0;
    }

    // Clouds
    this.clouds.forEach(c => {
      this.ctx.fillStyle = `rgba(255,255,255,${c.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      this.ctx.arc(c.x + c.size * 0.7, c.y + c.size * 0.2, c.size * 0.6, 0, Math.PI * 2);
      this.ctx.arc(c.x - c.size * 0.7, c.y + c.size * 0.2, c.size * 0.6, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawGroundElements(): void {
    this.ctx.fillStyle = '#166534';
    this.ctx.fillRect(0, this.groundLevel, this.width, this.height - this.groundLevel);
    this.ctx.fillStyle = '#14532d';
    const stripeWidth = 80;
    let offset = -(this.bgScroll % stripeWidth);
    for (let x = offset; x < this.width; x += stripeWidth) {
      this.ctx.beginPath(); this.ctx.moveTo(x, this.height); this.ctx.lineTo(x + 50, this.groundLevel); this.ctx.lineTo(x + 20, this.groundLevel); this.ctx.lineTo(x - 30, this.height); this.ctx.fill();
    }
    this.ctx.fillStyle = '#facc15';
    const dashWidth = 100, dashGap = 100;
    offset = -(this.bgScroll % (dashWidth + dashGap));
    for (let x = offset; x < this.width; x += (dashWidth + dashGap)) {
      this.ctx.fillRect(x, this.groundLevel + 20, dashWidth, 15);
    }

    // Springs
    this.springs.forEach(s => {
      if (!s.active) this.ctx.globalAlpha = 0.5;
      if (s.mul >= 500) {
        this.ctx.save(); this.ctx.translate(s.x, s.y);
        this.ctx.shadowBlur = 30; this.ctx.shadowColor = s.mul >= 10000 ? '#00ffff' : '#ffd700';
        this.ctx.rotate(this.gameTick * 0.05);
        this.ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(this.gameTick * 0.1) * 0.1})`;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) { this.ctx.rotate(Math.PI / 4); this.ctx.rect(-60, -5, 120, 10); }
        this.ctx.fill(); this.ctx.restore();
      }
      this.ctx.fillStyle = s.active ? '#1f2937' : '#4b5563';
      this.ctx.beginPath(); this.ctx.roundRect(s.x - s.w / 2, s.y, s.w, 20, 5); this.ctx.fill();
      this.ctx.strokeStyle = '#9ca3af'; this.ctx.lineWidth = 12; this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      const ph = Math.max(10, s.h * s.pulse - s.compress);
      this.ctx.moveTo(s.x - 40, s.y); this.ctx.lineTo(s.x + 40, s.y - ph * 0.3); this.ctx.lineTo(s.x - 40, s.y - ph * 0.6); this.ctx.lineTo(s.x + 40, s.y - ph); this.ctx.stroke();
      const boxY = s.y - ph - 25;
      this.ctx.save(); this.ctx.translate(s.x, boxY);
      const scaleY = 1 - (s.compress / 60);
      this.ctx.scale(s.pulse, s.pulse * scaleY);
      this.ctx.shadowBlur = s.glow ? 50 : 30; this.ctx.shadowColor = s.color;
      this.ctx.fillStyle = s.color; this.ctx.beginPath(); this.ctx.roundRect(-55, -35, 110, 70, 15); this.ctx.fill();
      this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 4; this.ctx.stroke(); this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = s.textColor;
      const fontSize = s.label.length >= 4 ? 36 : 48;
      this.ctx.font = `900 ${fontSize}px "Black Ops One"`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(s.label, 0, 4);
      this.ctx.restore(); this.ctx.globalAlpha = 1.0;
    });
  }

  private drawPinata(): void {
    this.ctx.save();
    this.ctx.translate(this.horse.x, this.horse.y);
    this.ctx.scale(this.horse.scale * 1.8 * this.horse.animScaleX, this.horse.scale * 1.8 * this.horse.animScaleY);
    this.ctx.rotate(this.horse.angle);

    // String
    this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.moveTo(0, -60); this.ctx.lineTo(0, -1000); this.ctx.stroke();

    let colors = ['#ec4899', '#a855f7', '#3b82f6', '#22c55e', '#eab308'];
    if (this.currentMultiplier >= 1000) colors = ['#000', '#1e1b4b', '#312e81', '#4338ca', '#000'];
    else if (this.currentMultiplier >= 50) colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#b45309', '#78350f'];
    else if (this.currentMultiplier >= 10) colors = ['#1e293b', '#334155', '#475569', '#06b6d4', '#0891b2'];

    // Body stripes
    for (let i = 0; i < 5; i++) {
      this.ctx.fillStyle = colors[i % 5];
      const off = Math.sin(this.gameTick * 0.2 + i) * 2;
      this.ctx.beginPath(); this.ctx.roundRect(-35 + off, -30 + i * 12, 70, 15, 2); this.ctx.fill();
    }

    // Head
    this.ctx.save(); this.ctx.translate(35, -20); this.ctx.rotate(-0.2);
    this.ctx.fillStyle = colors[0]; this.ctx.beginPath(); this.ctx.roundRect(-10, -30, 40, 30, 5); this.ctx.fill();
    this.ctx.fillStyle = 'white'; this.ctx.beginPath(); this.ctx.arc(15, -15, 6, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = 'black'; this.ctx.beginPath(); this.ctx.arc(17, -15, 2, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = colors[1]; this.ctx.beginPath(); this.ctx.moveTo(0, -30); this.ctx.lineTo(10, -50); this.ctx.lineTo(20, -30); this.ctx.fill();
    this.ctx.restore();

    // Legs
    this.ctx.fillStyle = colors[4];
    this.ctx.save(); this.ctx.translate(-20, 30); this.ctx.fillRect(-5, 0, 10, 30); this.ctx.restore();
    this.ctx.save(); this.ctx.translate(20, 30); this.ctx.fillRect(-5, 0, 10, 30); this.ctx.restore();
    this.ctx.restore();
  }

  private drawHorse(): void {
    this.ctx.save();
    this.ctx.translate(this.horse.x, this.horse.y);
    this.ctx.scale(this.horse.scale, this.horse.scale);
    this.ctx.rotate(this.horse.angle);

    if (this.state === 'GROUND') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.beginPath(); this.ctx.ellipse(0, 45, 40, 8, 0, 0, Math.PI * 2); this.ctx.fill();
    }

    const bob = Math.sin(this.gameTick * 0.4) * 3;
    const legSwing = Math.sin(this.gameTick * 0.8) * 0.8;

    // Back legs
    this.ctx.save(); this.ctx.fillStyle = '#5D4037'; this.ctx.translate(-20, 10 + bob); this.ctx.rotate(-legSwing); this.ctx.fillRect(-5, 0, 10, 30);
    this.ctx.translate(0, 30); this.ctx.rotate(legSwing * 0.5 + 0.5); this.ctx.fillRect(-4, 0, 8, 20); this.ctx.restore();
    this.ctx.save(); this.ctx.fillStyle = '#5D4037'; this.ctx.translate(20, 10 + bob); this.ctx.rotate(legSwing); this.ctx.fillRect(-5, 0, 10, 30);
    this.ctx.translate(0, 30); this.ctx.rotate(-legSwing * 0.5 + 0.5); this.ctx.fillRect(-4, 0, 8, 20); this.ctx.restore();

    // Body
    this.ctx.fillStyle = '#854d0e'; this.ctx.beginPath(); this.ctx.roundRect(-40, -20 + bob, 80, 40, 20); this.ctx.fill();

    // Tail
    this.ctx.save(); this.ctx.translate(-40, -10 + bob); this.ctx.rotate(Math.sin(this.gameTick * 0.5) * 0.5 + 0.5);
    this.ctx.fillStyle = '#3f1f10'; this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.quadraticCurveTo(-20, 10, -10, 30); this.ctx.lineTo(0, 10); this.ctx.fill(); this.ctx.restore();

    // Head & neck
    this.ctx.save(); this.ctx.translate(30, -15 + bob); this.ctx.rotate(-0.5 + Math.sin(this.gameTick * 0.4) * 0.1);
    this.ctx.fillStyle = '#854d0e'; this.ctx.fillRect(-10, -30, 20, 40);
    this.ctx.translate(0, -30); this.ctx.beginPath(); this.ctx.roundRect(-12, -20, 35, 25, 8); this.ctx.fill();
    // Ear
    this.ctx.fillStyle = '#3f1f10'; this.ctx.beginPath(); this.ctx.moveTo(-5, -20); this.ctx.lineTo(0, -35); this.ctx.lineTo(5, -20); this.ctx.fill();
    // Mane
    this.ctx.beginPath(); this.ctx.moveTo(-10, 0); this.ctx.quadraticCurveTo(-20, 20, -10, 40); this.ctx.lineTo(10, 0); this.ctx.fill();
    // Eye
    this.ctx.fillStyle = 'white'; this.ctx.beginPath(); this.ctx.arc(5, -12, 5, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = 'black'; this.ctx.beginPath(); this.ctx.arc(7, -12, 2, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.restore();

    // Wings (only when flying)
    if (this.horse.state !== 'RUN') {
      this.ctx.save(); this.ctx.translate(5, bob - 15);
      const flap = Math.sin(this.gameTick * 0.8) * 0.5;
      this.ctx.scale(1, 1 - flap * 0.5);
      this.ctx.fillStyle = '#ffffff'; this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-40, -60); this.ctx.lineTo(30, -25); this.ctx.fill();
      this.ctx.strokeStyle = '#cbd5e1'; this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawEffects(): void {
    // Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.life / 50;
      this.ctx.translate(p.x, p.y);
      if (p.type === 'coin') {
        this.ctx.fillStyle = '#FACC15'; this.ctx.strokeStyle = '#B45309'; this.ctx.lineWidth = 3;
        this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
      } else if (p.type === 'line') {
        this.ctx.fillStyle = p.color; this.ctx.fillRect(-(p.w || 100) / 2, -(p.h || 4) / 2, p.w || 100, p.h || 4);
      } else if (p.type === 'shockwave') {
        this.ctx.strokeStyle = p.color; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI * 2); this.ctx.stroke();
      } else if (p.type === 'confetti') {
        this.ctx.fillStyle = p.color; this.ctx.rotate(p.rotation * Math.PI / 180); this.ctx.fillRect(-(p.w || 8) / 2, -(p.h || 4) / 2, p.w || 8, p.h || 4);
      } else if (p.type === 'smoke') {
        this.ctx.fillStyle = `rgba(50,50,50,${p.life / 50})`; this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI * 2); this.ctx.fill();
      } else {
        this.ctx.fillStyle = p.color; this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI * 2); this.ctx.fill();
      }
      this.ctx.restore();
    });

    // Normal text
    this.texts.forEach(t => {
      if (t.type === 'BIG_WIN') return;
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      this.ctx.font = `900 ${t.currentSize}px "Black Ops One", sans-serif`;
      this.ctx.lineJoin = 'round'; this.ctx.textAlign = 'center';
      this.ctx.strokeStyle = 'black'; this.ctx.lineWidth = 6;
      this.ctx.strokeText(t.str, t.x, t.y);
      this.ctx.fillStyle = t.color;
      this.ctx.fillText(t.str, t.x, t.y);
      this.ctx.restore();
    });

    // BIG_WIN text (top layer)
    const bigWin = this.texts.find(t => t.type === 'BIG_WIN');
    if (bigWin) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.min(1, bigWin.life / 20);
      this.ctx.font = `900 ${bigWin.currentSize}px "Black Ops One", sans-serif`;
      this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
      this.ctx.shadowBlur = 40; this.ctx.shadowColor = '#FACC15';
      this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 15;
      this.ctx.strokeText(bigWin.str, bigWin.x, bigWin.y);
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = '#FFF'; this.ctx.lineWidth = 4;
      this.ctx.strokeText(bigWin.str, bigWin.x, bigWin.y);
      this.ctx.fillStyle = '#FACC15';
      this.ctx.fillText(bigWin.str, bigWin.x, bigWin.y);
      this.ctx.restore();
    }
  }

  // ============================================
  // Game Loop
  // ============================================

  private loop(timestamp: number): void {
    requestAnimationFrame((t) => this.loop(t));
    if (!this.lastFrameTime) { this.lastFrameTime = timestamp; return; }
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed > this.frameInterval) {
      this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
      this.update();
      this.draw();
    }
  }
}
