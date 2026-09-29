// Rate limiter supporting per-identifier limits.
type Bucket = {
  tokens: number;
  last: number; // ms
  capacity: number;
  refillPerMs: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export function checkRate(identifier: string, limit = 60, windowSeconds = 60): RateLimitResult {
  const now = Date.now();
  const capacity = limit;
  const refillPerMs = capacity / (windowSeconds * 1000);

  let b = buckets.get(identifier);
  if (!b) {
    b = { tokens: capacity, last: now, capacity, refillPerMs };
    buckets.set(identifier, b);
  }

  // refill
  const elapsed = now - b.last;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMs);
  b.last = now;

  const resetAt = now + Math.ceil((1 - b.tokens) / b.refillPerMs);

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(b.tokens),
      resetAt,
      retryAfter: 0,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt,
    retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function resetRate(identifier: string) {
  buckets.delete(identifier);
}

export function stats(identifier: string) {
  const b = buckets.get(identifier);
  if (!b) return null;
  return { capacity: b.capacity, tokens: Math.floor(b.tokens) };
}
