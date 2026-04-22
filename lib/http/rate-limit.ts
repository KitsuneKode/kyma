type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limiter for Route Handlers (in-memory).
 * Replace with Redis/Upstash for multi-instance production.
 */
export function rateLimitAllow(
  keyParts: string[],
  limit: number,
  windowMs: number,
): boolean {
  const key = keyParts.join(":");
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return false;
  }

  return true;
}
