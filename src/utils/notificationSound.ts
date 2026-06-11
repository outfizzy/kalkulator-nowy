// ═══════════════════════════════════════════════
// Notification Sound Utility — Web Audio API
// Pleasant chime sounds without external files
// ═══════════════════════════════════════════════

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a single tone with optional parameters
 */
function playTone(
  frequency: number,
  duration: number,
  volume: number = 0.3,
  startDelay: number = 0,
  type: OscillatorType = 'sine'
): void {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);

    // Smooth envelope: fade in, sustain, fade out
    gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + startDelay + 0.02);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime + startDelay + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime + startDelay);
    oscillator.stop(ctx.currentTime + startDelay + duration);
  } catch (err) {
    console.warn('[NotificationSound] Could not play tone:', err);
  }
}

/**
 * New Chat Sound — Higher pitch, 2 beeps
 * Played when a brand new chat session starts
 */
export function playNewChatSound(): void {
  // Two ascending chime notes
  playTone(880, 0.15, 0.25, 0, 'sine');   // A5
  playTone(1100, 0.2, 0.2, 0.18, 'sine'); // ~C#6
}

/**
 * New Message Sound — Single soft beep
 * Played when a new message arrives in an existing session
 */
export function playNewMessageSound(): void {
  // Single gentle notification tone
  playTone(660, 0.15, 0.15, 0, 'sine'); // E5
}

/**
 * Human Request Sound — Urgent triple beep
 * Played when a visitor explicitly asks for a human agent
 */
export function playHumanRequestSound(): void {
  // Three urgent, slightly louder notes (descending-ascending) to stand out
  playTone(988, 0.16, 0.3, 0, 'triangle');    // B5
  playTone(784, 0.16, 0.3, 0.18, 'triangle'); // G5
  playTone(988, 0.22, 0.3, 0.36, 'triangle'); // B5
}
