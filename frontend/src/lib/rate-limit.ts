interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const WINDOW_SIZE = 3600000; // 1 hour in milliseconds
const MAX_REQUESTS = 5; // Maximum requests per window

export async function rateLimit(
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const record = store[identifier];

  // Clean up expired entries
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  if (!record || record.resetTime < now) {
    // First request or expired window
    store[identifier] = {
      count: 1,
      resetTime: now + WINDOW_SIZE,
    };
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    return { success: false, remaining: 0 };
  }

  // Increment counter
  record.count += 1;
  return { success: true, remaining: MAX_REQUESTS - record.count };
} 