/**
 * In-memory rate limiter for API endpoints.
 *
 * Uses a sliding window approach per IP address.
 * Note: This is per-process only. For multi-instance deployments,
 * use Redis-based rate limiting instead.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given key (typically IP address or user ID).
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Peek the rate limit state for a key WITHOUT consuming a slot.
 *
 * ログイン系で「成功もカウントしてしまう」問題 (Issue #58) を避けるため、
 * 入口での判定はこの関数で行い、カウントは {@link recordFailedAttempt}
 * （失敗時のみ）で増やす。戻り値は {@link checkRateLimit} と同じ
 * {@link RateLimitResult}（`.allowed` で判定）。
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum number of failed attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function peekRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(key);

  if (!entry) {
    return { allowed: true, remaining: maxRequests, resetMs: windowMs };
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Record a single failed attempt for a key.
 *
 * 認証失敗（ユーザー無し／パスワード不一致など）の経路でのみ呼ぶ。
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param windowMs - Time window in milliseconds (古い記録の刈り込みに使用)
 */
export function recordFailedAttempt(key: string, windowMs: number): void {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);
}

/**
 * Clear all recorded attempts for a key.
 *
 * 認証成功時に呼び、その IP の失敗カウントをリセットする。
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Get client IP from request headers.
 * Supports x-forwarded-for header for reverse proxy setups.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
