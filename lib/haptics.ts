//lib/haptics.ts

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 35,
    };
    navigator.vibrate(patterns[type]);
  } catch {
    // Fail silently on unsupported hardware
  }
}