"use client";

/**
 * Web Audio API synthesized game sounds.
 * No audio files needed — generates tones/chimes/buzzes at runtime.
 * Retro-synth quality that fits the game show vibe.
 *
 * Each function returns an AudioBuffer that can be played via Howler
 * or directly through Web Audio API.
 */

type SoundName =
  | "tap"
  | "lock_in"
  | "drumroll"
  | "correct"
  | "wrong"
  | "streak"
  | "whoosh"
  | "finale"
  | "prayer";

const SAMPLE_RATE = 44100;

function createBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  return ctx.createBuffer(1, Math.floor(SAMPLE_RATE * duration), SAMPLE_RATE);
}

/** Quick pop/click */
function generateTap(): AudioBuffer {
  const duration = 0.06;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 80);
    data[i] = env * Math.sin(2 * Math.PI * 800 * t) * 0.3;
  }
  return buf;
}

/** Confident "chunk" sound */
function generateLockIn(): AudioBuffer {
  const duration = 0.15;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 25);
    const freq = 400 + 200 * Math.exp(-t * 30);
    data[i] =
      env *
      (Math.sin(2 * Math.PI * freq * t) * 0.3 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.15);
  }
  return buf;
}

/** Game show tension drumroll (1.5s loop) */
function generateDrumroll(): AudioBuffer {
  const duration = 1.5;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    // Tremolo at increasing speed
    const tremoloRate = 8 + t * 12;
    const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * tremoloRate * t);
    // Low rumble
    const rumble = Math.sin(2 * Math.PI * 80 * t) * 0.2;
    // Rising pitch
    const rising = Math.sin(2 * Math.PI * (200 + t * 150) * t) * 0.15;
    // Crescendo envelope
    const env = 0.3 + t * 0.5;
    data[i] = env * tremolo * (rumble + rising);
  }
  return buf;
}

/** Bright ascending chime */
function generateCorrect(): AudioBuffer {
  const duration = 0.5;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  const notes = [523, 659, 784]; // C5, E5, G5
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.08;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const env = Math.exp(-noteT * 5);
        sample += env * Math.sin(2 * Math.PI * notes[n] * noteT) * 0.2;
      }
    }
    data[i] = sample;
  }
  return buf;
}

/** Comedic buzzer (not harsh) */
function generateWrong(): AudioBuffer {
  const duration = 0.3;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 8);
    // Two slightly detuned low tones for a "wah wah" effect
    const tone1 = Math.sin(2 * Math.PI * 150 * t);
    const tone2 = Math.sin(2 * Math.PI * 155 * t);
    data[i] = env * (tone1 + tone2) * 0.15;
  }
  return buf;
}

/** Fire/sizzle for streaks */
function generateStreak(): AudioBuffer {
  const duration = 0.4;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    // Filtered noise + rising tone
    const noise = (Math.random() * 2 - 1) * 0.1;
    const tone = Math.sin(2 * Math.PI * (600 + t * 800) * t) * 0.2;
    data[i] = env * (noise + tone);
  }
  return buf;
}

/** Clean swoosh for transitions */
function generateWhoosh(): AudioBuffer {
  const duration = 0.3;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin((Math.PI * t) / duration) * 0.8;
    // Sweeping noise
    const noise = Math.random() * 2 - 1;
    // Bandpass via multiplying with a sweeping sine
    const sweep = Math.sin(2 * Math.PI * (200 + t * 2000) * t);
    data[i] = env * noise * sweep * 0.15;
  }
  return buf;
}

/** Triumphant fanfare for final results */
function generateFinale(): AudioBuffer {
  const duration = 1.2;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  // C major arpeggio: C4, E4, G4, C5
  const notes = [262, 330, 392, 523];
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.15;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const env = Math.exp(-noteT * 2);
        // Richer tone with harmonics
        sample +=
          env *
          (Math.sin(2 * Math.PI * notes[n] * noteT) * 0.2 +
            Math.sin(2 * Math.PI * notes[n] * 2 * noteT) * 0.08 +
            Math.sin(2 * Math.PI * notes[n] * 3 * noteT) * 0.04);
      }
    }
    data[i] = sample;
  }
  return buf;
}

/** Gentle bell for prayer */
function generatePrayer(): AudioBuffer {
  const duration = 0.8;
  const ctx = new OfflineAudioContext(
    1,
    Math.floor(SAMPLE_RATE * duration),
    SAMPLE_RATE,
  );
  const buf = createBuffer(ctx, duration);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 3);
    // Bell-like with inharmonic partials
    const f0 = 880;
    data[i] =
      env *
      (Math.sin(2 * Math.PI * f0 * t) * 0.2 +
        Math.sin(2 * Math.PI * f0 * 2.76 * t) * 0.1 +
        Math.sin(2 * Math.PI * f0 * 5.4 * t) * 0.05);
  }
  return buf;
}

const generators: Record<SoundName, () => AudioBuffer> = {
  tap: generateTap,
  lock_in: generateLockIn,
  drumroll: generateDrumroll,
  correct: generateCorrect,
  wrong: generateWrong,
  streak: generateStreak,
  whoosh: generateWhoosh,
  finale: generateFinale,
  prayer: generatePrayer,
};

/**
 * Generate all sound buffers. Call once during preload.
 * Returns a map of sound name → AudioBuffer.
 */
export function generateAllSounds(): Map<SoundName, AudioBuffer> {
  const sounds = new Map<SoundName, AudioBuffer>();
  for (const [name, gen] of Object.entries(generators)) {
    sounds.set(name as SoundName, gen());
  }
  return sounds;
}

export type { SoundName };
