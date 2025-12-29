type AuthAttemptState = {
  failures: number;
  lockedUntilMs: number;
  updatedAtMs: number;
  lastLockEmailSentAtMs: number;
};

const store = new Map<string, AuthAttemptState>();

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const STATE_TTL_MS = 24 * 60 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function prune(now: number) {
  for (const [key, value] of store.entries()) {
    if (now - value.updatedAtMs > STATE_TTL_MS) store.delete(key);
  }
}

export function getAuthAttemptKey(params: { ip: string; email: string }): string {
  return `auth:${params.ip}:${params.email.toLowerCase()}`;
}

export function checkAuthLockout(key: string, now = nowMs()): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  prune(now);
  const state = store.get(key);
  if (!state) return { locked: false, retryAfterSeconds: 0 };
  if (state.lockedUntilMs > now) {
    return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil((state.lockedUntilMs - now) / 1000)) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export function clearAuthFailures(key: string, now = nowMs()): void {
  prune(now);
  store.delete(key);
}

export function recordAuthFailure(key: string, now = nowMs()): {
  lockedNow: boolean;
  failures: number;
  lockedUntilMs: number;
} {
  prune(now);

  const existing = store.get(key);
  const current: AuthAttemptState = existing
    ? { ...existing }
    : { failures: 0, lockedUntilMs: 0, updatedAtMs: now, lastLockEmailSentAtMs: 0 };

  // If previously locked but lock expired, reset counter.
  if (current.lockedUntilMs && current.lockedUntilMs <= now) {
    current.failures = 0;
    current.lockedUntilMs = 0;
  }

  current.failures += 1;
  current.updatedAtMs = now;

  if (current.failures >= MAX_FAILURES) {
    current.failures = 0;
    current.lockedUntilMs = now + LOCK_MS;
    store.set(key, current);
    return { lockedNow: true, failures: MAX_FAILURES, lockedUntilMs: current.lockedUntilMs };
  }

  store.set(key, current);
  return { lockedNow: false, failures: current.failures, lockedUntilMs: current.lockedUntilMs };
}

export function shouldSendLockoutEmail(key: string, now = nowMs()): boolean {
  const state = store.get(key);
  if (!state) return false;
  if (!state.lockedUntilMs || state.lockedUntilMs <= now) return false;

  // send at most once per lock window
  if (state.lastLockEmailSentAtMs && state.lastLockEmailSentAtMs > now - LOCK_MS) return false;

  state.lastLockEmailSentAtMs = now;
  state.updatedAtMs = now;
  store.set(key, state);
  return true;
}

export const authRateLimitConfig = {
  MAX_FAILURES,
  LOCK_MS,
};
