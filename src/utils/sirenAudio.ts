// Web Audio API Synthesizer for Emergency Ambulance Siren
class SirenSynthesizer {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public play(type: 'wail' | 'yelp' = 'wail') {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.isPlaying) {
        this.stop();
      }

      this.isPlaying = true;
      const ctx = this.audioCtx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.08, ctx.currentTime); // comfortable volume

      osc.connect(gain);
      gain.connect(ctx.destination);

      let lowFreq = 650;
      let highFreq = 950;
      let sweepTime = type === 'yelp' ? 0.35 : 1.2;

      let direction = 1;
      let currentFreq = lowFreq;
      osc.frequency.setValueAtTime(lowFreq, ctx.currentTime);

      const intervalMs = 50;
      const step = (highFreq - lowFreq) / (sweepTime * 1000 / intervalMs);

      this.intervalId = window.setInterval(() => {
        if (!this.isPlaying || !this.osc) return;
        currentFreq += direction * step;
        if (currentFreq >= highFreq) {
          currentFreq = highFreq;
          direction = -1;
        } else if (currentFreq <= lowFreq) {
          currentFreq = lowFreq;
          direction = 1;
        }
        osc.frequency.setValueAtTime(currentFreq, ctx.currentTime);
      }, intervalMs);

      osc.start();
      this.osc = osc;
      this.gainNode = gain;
    } catch (err) {
      console.warn('Audio siren error:', err);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {}
      this.osc = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play('wail');
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ambulanceSiren = new SirenSynthesizer();
