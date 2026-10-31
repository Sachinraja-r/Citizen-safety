/**
 * Emergency Alert Audio & Vibration Synthesizer
 *
 * Implements a government emergency alert system (EAS) inspired acoustic signature
 * using the Web Audio API (dual sine wave modulation at 853 Hz and 960 Hz).
 *
 * NOTE ON DEVICE LIMITATIONS:
 * Web applications cannot bypass OS hardware silent switches, Do Not Disturb,
 * or browser autoplay policies without user gesture or granted system privileges.
 */

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let gainNode: GainNode | null = null;
let pulseTimer: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  return audioCtx;
}

/**
 * Triggers distinct emergency vibration pattern where supported.
 * Pattern: [beep, pause, beep, pause, long-beep]
 */
export function triggerEmergencyVibration(): boolean {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // 400ms on, 150ms off, 400ms on, 150ms off, 800ms on
      return navigator.vibrate([400, 150, 400, 150, 800]);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Triggers a prolonged SOS vibration pattern (~5 seconds) for emergency alert.
 * Pattern: S-O-S in Morse code extended with long continuous bursts.
 * Total duration ≈ 5200ms
 * Intended for use when emergency contact opens the alert for the first time.
 */
export function triggerSosVibration(): boolean {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // S = ... (3 short)  O = --- (3 long)  S = ... (3 short)
      // short = 200ms, long = 600ms, gap between symbols = 200ms, gap between letters = 400ms
      const S = [200, 100, 200, 100, 200]; // S in Morse
      const letterGap = [400];
      const O = [600, 100, 600, 100, 600]; // O in Morse
      const pattern = [...S, ...letterGap, ...O, ...letterGap, ...S];
      // Fill remaining time up to ~5s with strong continuous buzz
      const used = pattern.reduce((a, b) => a + b, 0); // ~3900ms
      const remaining = Math.max(0, 5000 - used);
      if (remaining > 0) {
        pattern.push(200, 100); // brief pause then final buzz
        pattern.push(remaining - 300);
      }
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Cancels any active vibration immediately.
 */
export function stopVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}

/**
 * Plays the distinctive Emergency Alert Sound (EAS dual-tone: 853 Hz + 960 Hz).
 *
 * @param options.durationMs Duration in milliseconds (default: 4000ms)
 * @param options.loop Whether the alert should loop indefinitely until stopped (default: false)
 * @returns boolean indicating whether audio playback succeeded
 */
export async function playEmergencyAlertSound(options?: {
  durationMs?: number;
  loop?: boolean;
}): Promise<boolean> {
  const duration = options?.durationMs ?? 4000;
  const loop = options?.loop ?? false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    // If AudioContext was suspended by browser autoplay policy, resume it
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Stop any existing sound
    stopEmergencyAlertSound();

    // Trigger tactile emergency vibration
    triggerEmergencyVibration();

    // Create Master Gain
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.connect(ctx.destination);

    // Tone 1: 853 Hz (EAS lower tone)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(853, ctx.currentTime);
    osc1.connect(gainNode);

    // Tone 2: 960 Hz (EAS higher tone)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(960, ctx.currentTime);
    osc2.connect(gainNode);

    osc1.start();
    osc2.start();
    activeOscillators = [osc1, osc2];
    isPlaying = true;

    // Pulsing modulation: toggle volume to create rapid alert chirps (500ms on, 150ms off)
    let isPulseHigh = true;
    pulseTimer = setInterval(() => {
      if (!gainNode || !ctx || !isPlaying) return;
      isPulseHigh = !isPulseHigh;
      const targetGain = isPulseHigh ? 0.35 : 0.05;
      gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.03);

      if (isPulseHigh) {
        triggerEmergencyVibration();
      }
    }, 350);

    // Auto-stop after duration if not looping
    if (!loop && duration > 0) {
      setTimeout(() => {
        stopEmergencyAlertSound();
      }, duration);
    }

    return true;
  } catch (err) {
    console.warn('Emergency alert audio playback blocked or unsupported:', err);
    return false;
  }
}

/**
 * Stops the emergency alert audio and vibration immediately.
 */
export function stopEmergencyAlertSound(): void {
  if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Ignore if already stopped
    }
  });
  activeOscillators = [];

  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch {
      // Ignore
    }
    gainNode = null;
  }

  isPlaying = false;
}

export function isEmergencyAlertPlaying(): boolean {
  return isPlaying;
}
