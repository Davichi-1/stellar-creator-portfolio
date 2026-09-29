import { prisma } from '@/lib/prisma';
import { GraphQLContext } from './context';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const REGISTERED_RATE_LIMIT_QUOTA = 100; // queries per minute for unauthenticated / API key requests
const AUTHENTICATED_RATE_LIMIT_QUOTA = 500; // higher tier for authenticated profile actions

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}

function getQuota(ctx: GraphQLContext): number {
  return ctx.userId ? AUTHENTICATED_RATE_LIMIT_QUOTA : REGISTERED_RATE_LIMIT_QUOTA;
}

export async function checkRateLimit(
  ctx: GraphQLContext,
  operationName?: string
}): Promise<{ remaining: number; resetAt: Date }> {
  const quota = getQuota(ctx);
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Authenticated users are tracked by user id; API key requests by api key id.
  const where = ctx.userId
    ? { userId: ctx.userId, timestamp: { gte: windowStart } }
    : ctx.apiKeyId
      ? { apiKeyId: ctx.apiKeyId, timestamp: { gte: windowStart } }
      : null;

  // Unauthenticated requests without an API key are not tracked here.
  if (!where) {
    return {
      remaining: quota,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    };
  }

  // Count queries in the current window.
  const count = await prisma.apiKeyUsage.count({ where });

  if (count >= quota) {
    const oldestQuery = await prisma.apiKeyUsage.findFirst({
      where,
      orderBy: { timestamp: 'asc' },
    });

    if (oldestQuery) {
      const resetAt = new Date(oldestQuery.timestamp.getTime() + RATE_LIMIT_WINDOW_MS);
      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
      throw new RateLimitError(Math.max(1, retryAfter));
    }
  }

  // Record this query.
  await prisma.apiKeyUsage.create({
    data: {
      apiKeyId: ctx.apiKeyId,
      userId: ctx.userId,
      queryPath: operationName || 'unnamed',
    },
  });

  return {
    remaining: Math.max(0, quota - count - 1),
    resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
  };
}
