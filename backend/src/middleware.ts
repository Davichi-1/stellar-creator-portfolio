import { checkRate } from "./rateLimit";
import type { Request, Response, NextFunction } from "express";

// Express-style middleware. Applies stricter limits for unauthenticated users.
export function rateLimitMiddleware(opts?: { unauthenticatedLimit?: number; authenticatedLimit?: number }) {
  const unauthenticatedLimit = opts?.unauthenticatedLimit ?? 30; // per minute
  const authenticatedLimit = opts?.authenticatedLimit ?? 300; // per minute

  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const ipAuthenticated = !!(req as any).user;
      const identifier = ipAuthenticated
        ? `user:${((req as any).user?.id || (req as any).user?.userId || 'unknown')} `
        : ((req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown') as string);
      const limit = ipAuthenticated ? authenticatedLimit : unauthenticatedLimit;
      const result = checkRate(identifier, limit, 60);

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfter));
        res.status(429).json({ error: 'Too many requests' });
        return;
      }
      next();
    } catch (e) {
      // Fail-open: do not block traffic if rate limiter crashes
      console.error('rateLimitMiddleware error', e);
      next();
    }
  };
}
