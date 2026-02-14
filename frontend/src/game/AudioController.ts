export class AudioController {
  private ctx: AudioContext | null = null;
  public enabled = false;
  public musicEnabled = true;
  public sfxEnabled = true;
  private currentBPM = 120;
  private targetBPM = 120;
  private nextNoteTime = 0;
  private noteIdx = 0;
  private isSkyMode = false;

  private bassLine = [110, 0, 110, 146, 0, 130, 0, 110, 98, 0, 98, 110, 130, 0, 146, 165];
  private melodyLine = [330, 392, 440, 0, 392, 330, 293, 0, 261, 293, 330, 392, 440, 0, 523, 587];

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.enabled = true;
      this.startLoop();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, slideFreq?: number): void {
    if (!this.enabled || !freq || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol = 0.1): void {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  playSmallWin(): void { if (this.sfxEnabled) this.playTone(880, 'sine', 0.1, 0.1); }
  playJump(): void { if (this.sfxEnabled) this.playTone(150, 'square', 0.1, 0.1, 600); }
  playLaunchFail(): void { if (!this.sfxEnabled) return; this.playNoise(0.3, 0.4); this.playTone(60, 'sawtooth', 0.4, 0.3); }
  playHit(): void { if (!this.sfxEnabled) return; this.playNoise(0.1, 0.3); this.playTone(100, 'sawtooth', 0.1, 0.2, 50); }
  playShoot(): void { if (!this.sfxEnabled) return; this.playNoise(0.05, 0.2); this.playTone(200, 'sawtooth', 0.05, 0.2, 50); }
  playReload(): void { if (!this.sfxEnabled) return; this.playTone(400, 'sine', 0.1, 0.1, 600); setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1, 800), 150); }
  playWin(): void { if (!this.sfxEnabled) return; this.playTone(1200, 'sine', 0.1, 0.1); setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.1), 50); }
  playExplode(): void { if (!this.sfxEnabled) return; this.playNoise(0.8, 0.8); this.playTone(100, 'sawtooth', 0.5, 0.5, 10); }

  setSkyMode(isSky: boolean): void {
    this.isSkyMode = isSky;
    this.targetBPM = isSky ? 170 : 120;
  }

  private startLoop(): void {
    if (!this.ctx) return;
    if (this.nextNoteTime === 0) this.nextNoteTime = this.ctx.currentTime + 0.1;
    const scheduler = (): void => {
      if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') {
        requestAnimationFrame(scheduler);
        return;
      }
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        if (this.musicEnabled) this.scheduleNote(this.noteIdx, this.nextNoteTime);
        this.noteIdx++;
        this.currentBPM += (this.targetBPM - this.currentBPM) * 0.1;
        this.nextNoteTime += (60.0 / this.currentBPM) * 0.25;
      }
      requestAnimationFrame(scheduler);
    };
    scheduler();
  }

  private scheduleNote(idx: number, time: number): void {
    if (!this.ctx) return;
    const bassNote = this.bassLine[idx % this.bassLine.length];
    const isStrongBeat = idx % 4 === 0;
    if (bassNote > 0) {
      const bassType: OscillatorType = this.isSkyMode ? 'square' : 'triangle';
      let bassVol = this.isSkyMode ? 0.1 : 0.06;
      if (isStrongBeat) bassVol *= 1.2;
      this.playToneScheduled(bassNote, bassType, 0.15, bassVol, time);
    }
    if (this.isSkyMode) {
      const melNote = this.melodyLine[idx % this.melodyLine.length];
      if (melNote > 0) {
        const melType: OscillatorType = (idx % 8 < 4) ? 'sawtooth' : 'square';
        this.playToneScheduled(melNote, melType, 0.1, 0.04, time);
        if (Math.random() < 0.3) this.playToneScheduled(melNote * 2, 'sine', 0.05, 0.03, time + 0.05);
      }
    }
  }

  private playToneScheduled(freq: number, type: OscillatorType, duration: number, vol: number, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }
}
