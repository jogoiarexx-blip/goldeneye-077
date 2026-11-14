    /**
     * =========================================================================
     * 1. SISTEMA DE ÁUDIO PROCEDURAL (WEB AUDIO API)
     * Gera efeitos sonoros de tiro, silenciador, alarme, recarga e trilha
     * dinâmica de espionagem sem depender de arquivos externos.
     * =========================================================================
     */
    class ProceduralAudio {
      constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicInterval = null;
        this.combatIntensity = false;
      }

      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
          this.stopMusic();
        } else if (this.ctx) {
          this.startMusic();
        }
        return this.enabled;
      }

      playShot(silenced) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = silenced ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(silenced ? 420 : 190, now);
        osc.frequency.exponentialRampToValueAtTime(silenced ? 90 : 38, now + (silenced ? 0.08 : 0.18));

        gain.gain.setValueAtTime(silenced ? 0.14 : 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (silenced ? 0.09 : 0.2));

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (silenced ? 0.09 : 0.2));
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };

        // Cached noise gives the shot a short crack; a low-pass keeps the
        // suppressed pistol softer. No sound downloads or per-shot buffers.
        if (!this.shotNoise) {
          this.shotNoise = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 0.25), this.ctx.sampleRate);
          const data = this.shotNoise.getChannelData(0);
          for (let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
        }
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter(), envelope = this.ctx.createGain();
        const duration = silenced ? 0.055 : 0.14;
        noise.buffer = this.shotNoise;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(silenced ? 1400 : 6500, now);
        filter.frequency.exponentialRampToValueAtTime(silenced ? 350 : 900, now+duration);
        envelope.gain.setValueAtTime(silenced ? 0.12 : 0.32, now);
        envelope.gain.exponentialRampToValueAtTime(0.001, now+duration);
        noise.connect(filter); filter.connect(envelope); envelope.connect(this.ctx.destination);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); envelope.disconnect(); };
        noise.start(now); noise.stop(now+duration);

      }

      playReload() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.18].forEach((offset, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(i === 0 ? 520 : 780, now + offset);
          gain.gain.setValueAtTime(0.08, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.06);
        });
      }

      playGadgetBeep(success = true) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(success ? 880 : 240, now);
        osc.frequency.setValueAtTime(success ? 1320 : 180, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      playAlarmPulse() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.linearRampToValueAtTime(480, now + 0.28);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      playHitPlayer() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      startMusic() {
        this.stopMusic();
        if (!this.enabled) return;
        let step = 0;
        const bassStealth = [110, 110, 116.54, 110, 130.81, 123.47, 110, 98];
        const bassCombat = [110, 146.83, 130.81, 164.81, 110, 146.83, 174.61, 164.81];

        this.musicInterval = setInterval(() => {
          if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
          const now = this.ctx.currentTime;
          const notes = this.combatIntensity ? bassCombat : bassStealth;
          const freq = notes[step % notes.length];
          step++;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = this.combatIntensity ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(this.combatIntensity ? 0.055 : 0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        }, 280);
      }

      stopMusic() {
        if (this.musicInterval) {
          clearInterval(this.musicInterval);
          this.musicInterval = null;
        }
      }
    }

    /**
     * =========================================================================
     * 2. CONFIGURAÇÃO DE MISSÕES E DIFICULDADES (GDD SEÇÕES 7.01 & 7.02)
     * =========================================================================
     */
