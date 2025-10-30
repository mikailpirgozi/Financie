import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis/Upstash)
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key]!.resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;
  /**
   * Time window in seconds
   */
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter using sliding window algorithm
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 100, window: 60 }
): Promise<RateLimitResult> {
  // Get identifier (IP address or user ID)
  const identifier = getIdentifier(request);
  
  const now = Date.now();
  const windowMs = config.window * 1000;
  const key = `${identifier}:${Math.floor(now / windowMs)}`;

  // Get or create entry
  let entry = store[key];
  
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    store[key] = entry;
  }

  // Increment count
  entry.count++;

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: entry.resetTime,
  };
}

/**
 * Get identifier from request (IP or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  // In production, you might want to use user ID if authenticated
  // const userId = request.headers.get('x-user-id');
  // return userId || ip;

  return ip;
}

/**
 * Middleware helper to apply rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<Response> => {
    const result = await rateLimit(request, config);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.reset).toISOString(),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request);
    
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

    return response;
  };
}

