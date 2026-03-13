const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxRequests) {
    rateLimitMap.set(key, valid);
    return false; // Rate limit exceeded
  }

  valid.push(now);
  rateLimitMap.set(key, valid);
  return true; // Allowed
}
