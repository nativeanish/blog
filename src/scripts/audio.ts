// Web Audio API procedural morning garden breeze soundscape
class GardenSoundscape {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
  }

  public toggle(): boolean {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }

    return this.isPlaying;
  }

  private start() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.065, now + 2.5); // Soft serene volume
    this.masterGain.connect(this.ctx.destination);

    // Warm botanical low-pass filter (simulating breeze through foliage)
    const foliageFilter = this.ctx.createBiquadFilter();
    foliageFilter.type = 'lowpass';
    foliageFilter.frequency.setValueAtTime(420, now);
    foliageFilter.Q.setValueAtTime(2.2, now);
    foliageFilter.connect(this.masterGain);

    // Gentle wind sway LFO (slow organic breathing)
    const windLfo = this.ctx.createOscillator();
    const windLfoGain = this.ctx.createGain();
    windLfo.frequency.setValueAtTime(0.09, now); // ~11s cycle
    windLfoGain.gain.setValueAtTime(140, now);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(foliageFilter.frequency);
    windLfo.start(now);
    this.oscillators.push(windLfo);

    // Ground Root Tone (Warm Earth Sine: 110Hz - A2)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(110, now);
    osc1.connect(foliageFilter);
    osc1.start(now);
    this.oscillators.push(osc1);

    // Gentle Botanical Harmonics (164.8Hz - E3)
    const osc2 = this.ctx.createOscillator();
    const osc2Gain = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(164.8, now);
    osc2.detune.setValueAtTime(3, now);
    osc2Gain.gain.setValueAtTime(0.4, now);
    osc2.connect(osc2Gain);
    osc2Gain.connect(foliageFilter);
    osc2.start(now);
    this.oscillators.push(osc2);

    // Morning Sun Shimmer (220Hz - A3 + warm triangle)
    const osc3 = this.ctx.createOscillator();
    const osc3Gain = this.ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(220, now);
    osc3.detune.setValueAtTime(-2, now);
    osc3Gain.gain.setValueAtTime(0.25, now);
    osc3.connect(osc3Gain);
    osc3Gain.connect(foliageFilter);
    osc3.start(now);
    this.oscillators.push(osc3);

    // Dewdrop Chime Resonance (329.6Hz - E4)
    const osc4 = this.ctx.createOscillator();
    const osc4Gain = this.ctx.createGain();
    osc4.type = 'sine';
    osc4.frequency.setValueAtTime(329.63, now);
    osc4Gain.gain.setValueAtTime(0.12, now);
    osc4.connect(osc4Gain);
    osc4Gain.connect(foliageFilter);
    osc4.start(now);
    this.oscillators.push(osc4);

    this.isPlaying = true;
  }

  private stop() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignored
        }
      });
      this.oscillators = [];
      this.isPlaying = false;
    }, 1500);
  }

  public get active(): boolean {
    return this.isPlaying;
  }
}

export const soundscape = new GardenSoundscape();
