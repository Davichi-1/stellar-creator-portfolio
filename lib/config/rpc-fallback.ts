/**
 * High-availability RPC client for Soroban.
 *
 * Maintains a pool of primary and secondary endpoints per network. On each
 * call it tries the current primary; on timeout or HTTP error it rotates to
 * the next endpoint and retries — automatically switching between providers
 * so a single point of failure never degrades user capabilities.
 *
 * Background latency probes run at a configurable interval and promote the
 * healthiest node to the front of the pool using a weighted health score that
 * accounts for both latency and recent error rate.
 *
 * Primary endpoints (index 0–2) are tier-1 providers; secondary/fallback
 * endpoints (index 3+) are used only when all primaries have failed or show
 * degraded health.
 *
 * Related: #1350
 */

import { type NetworkName } from "./network";

// ---------------------------------------------------------------------------
// Endpoint pools — env vars override defaults at each position.
// Primary = indices 0-2 (high-reliability providers).
// Secondary = indices 3+ (fallback providers for extra HA redundancy).
// ---------------------------------------------------------------------------

const POOLS: Record<NetworkName, string[]> = {
  mainnet: [
    // Primary endpoints
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL    ?? "https://soroban-mainnet.stellar.org",
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL_2  ?? "https://mainnet.stellar.validationcloud.io/v1/soroban/rpc",
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL_3  ?? "https://rpc.ankr.com/stellar_soroban",
    // Secondary / fallback endpoints
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL_4  ?? "https://mainnet.sorobanrpc.com",
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL_5  ?? "https://horizon.stellar.org",   // Horizon JSON-RPC shim
  ],
  testnet: [
    // Primary endpoints
    process.env.NEXT_PUBLIC_TESTNET_RPC_URL    ?? "https://soroban-testnet.stellar.org",
    process.env.NEXT_PUBLIC_TESTNET_RPC_URL_2  ?? "https://testnet.stellar.validationcloud.io/v1/soroban/rpc",
    // Secondary / fallback endpoints
    process.env.NEXT_PUBLIC_TESTNET_RPC_URL_3  ?? "https://testnet.sorobanrpc.com",
  ],
};

// How many of the first N endpoints are considered "primary" (healthy rotation
// stays within this range; secondaries are only promoted when needed).
const PRIMARY_COUNT: Record<NetworkName, number> = { mainnet: 3, testnet: 2 };

const REQUEST_TIMEOUT_MS     = 5_000;
const PROBE_INTERVAL_MS      = 30_000;
// Weight for exponential moving average of error rate (0–1); higher = faster
// reaction to recent errors.
const ERROR_EMA_ALPHA        = 0.3;
// Latency penalty multiplier added per 1 % of recent error rate when computing
// health score — ensures a fast-but-flaky endpoint doesn't stay at index 0.
const ERROR_PENALTY_PER_PCT  = 50; // ms

// ---------------------------------------------------------------------------
// Per-network state
// ---------------------------------------------------------------------------

interface EndpointStats {
  latencyMs: number;    // last measured round-trip in ms (Infinity = unknown)
  errorRate: number;    // exponential moving average of error fraction [0, 1]
  consecutiveFails: number;
}

interface PoolState {
  urls: string[];
  index: number;          // current primary
  stats: EndpointStats[];
  probeTimer?: ReturnType<typeof setInterval>;
}

function makeStats(count: number): EndpointStats[] {
  return Array.from({ length: count }, () => ({
    latencyMs: Infinity,
    errorRate: 0,
    consecutiveFails: 0,
  }));
}

const state: Record<NetworkName, PoolState> = {
  mainnet: { urls: [...POOLS.mainnet], index: 0, stats: makeStats(POOLS.mainnet.length) },
  testnet: { urls: [...POOLS.testnet], index: 0, stats: makeStats(POOLS.testnet.length) },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rotate(pool: PoolState): void {
  pool.index = (pool.index + 1) % pool.urls.length;
}

/**
 * Compute a composite health score for an endpoint (lower is healthier).
 * Combines latency with a penalty proportional to the recent error rate so
 * a fast-but-flaky node doesn't stay at the front indefinitely.
 */
function healthScore(s: EndpointStats): number {
  if (s.consecutiveFails >= 3) return Infinity; // circuit-open: skip until probe recovers
  const latency = s.latencyMs === Infinity ? 999_999 : s.latencyMs;
  const errorPenalty = s.errorRate * 100 * ERROR_PENALTY_PER_PCT;
  return latency + errorPenalty;
}

/** Promote the lowest health-score endpoint to index 0 within the primary
 *  range; secondaries are only considered if all primaries are unhealthy. */
function reorder(pool: PoolState, network: NetworkName): void {
  const primaryCount = PRIMARY_COUNT[network];
  const scores = pool.stats.map(healthScore);

  // Find best primary
  let bestPrimary = 0;
  for (let i = 1; i < primaryCount && i < pool.urls.length; i++) {
    if (scores[i] < scores[bestPrimary]) bestPrimary = i;
  }

  // If all primaries are circuit-open, fall back to secondaries
  const effectiveBest = scores[bestPrimary] === Infinity
    ? scores.reduce((b, s, i) => s < scores[b] ? i : b, primaryCount)
    : bestPrimary;

  if (effectiveBest !== 0) {
    [pool.urls[0], pool.urls[effectiveBest]]   = [pool.urls[effectiveBest], pool.urls[0]];
    [pool.stats[0], pool.stats[effectiveBest]] = [pool.stats[effectiveBest], pool.stats[0]];
    pool.index = 0;
  }
}

/** Record a successful call outcome for latency EMA tracking. */
function recordSuccess(pool: PoolState, idx: number, latencyMs: number): void {
  const s = pool.stats[idx];
  s.latencyMs = s.latencyMs === Infinity ? latencyMs : (s.latencyMs * 0.8 + latencyMs * 0.2);
  s.errorRate = s.errorRate * (1 - ERROR_EMA_ALPHA); // decays toward 0 on success
  s.consecutiveFails = 0;
}

/** Record a failed call outcome for error-rate EMA tracking. */
function recordFailure(pool: PoolState, idx: number): void {
  const s = pool.stats[idx];
  s.errorRate = s.errorRate * (1 - ERROR_EMA_ALPHA) + ERROR_EMA_ALPHA;
  s.consecutiveFails += 1;
}

async function fetchWithTimeout(url: string, body: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Latency probe
// ---------------------------------------------------------------------------

async function probeEndpoint(url: string): Promise<number> {
  const ping = JSON.stringify({ jsonrpc: "2.0", id: 0, method: "getHealth", params: [] });
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(url, ping);
    if (!res.ok) return Infinity;
    await res.json();
    return Date.now() - t0;
  } catch {
    return Infinity;
  }
}

async function runProbe(pool: PoolState, network: NetworkName): Promise<void> {
  const results = await Promise.all(pool.urls.map(probeEndpoint));
  results.forEach((ms, i) => {
    if (ms === Infinity) {
      recordFailure(pool, i);
    } else {
      recordSuccess(pool, i, ms);
    }
  });
  reorder(pool, network);
}

/** Start background health probing for a network (idempotent). */
export function startProbing(network: NetworkName): void {
  const pool = state[network];
  if (pool.probeTimer) return;
  // Run once immediately, then on interval.
  void runProbe(pool, network);
  pool.probeTimer = setInterval(() => void runProbe(pool, network), PROBE_INTERVAL_MS);
}

/** Stop background probing (e.g. in tests or SSR teardown). */
export function stopProbing(network: NetworkName): void {
  const pool = state[network];
  if (pool.probeTimer) {
    clearInterval(pool.probeTimer);
    pool.probeTimer = undefined;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RpcCallResult<T> {
  data: T;
  endpoint: string;       // which URL actually served the response
  attempts: number;
}

/**
 * Send a JSON-RPC request to the pool for `network`, automatically retrying
 * against the next endpoint on timeout or HTTP error.
 *
 * On success the latency and error-rate stats for the winning endpoint are
 * updated inline so the pool self-heals without waiting for the next probe.
 *
 * @throws if all endpoints fail.
 */
export async function rpcCall<T = unknown>(
  network: NetworkName,
  method: string,
  params: unknown = [],
): Promise<RpcCallResult<T>> {
  const pool = state[network];
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const tried = new Set<number>();

  for (let attempt = 1; attempt <= pool.urls.length; attempt++) {
    const idx = pool.index;
    if (tried.has(idx)) { rotate(pool); continue; }
    tried.add(idx);

    const url = pool.urls[idx];
    const t0 = Date.now();
    try {
      const res = await fetchWithTimeout(url, body);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (json.error) throw new Error(json.error.message ?? "RPC error");

      // Record success for inline health update.
      recordSuccess(pool, idx, Date.now() - t0);
      return { data: json.result as T, endpoint: url, attempts: attempt };
    } catch {
      recordFailure(pool, idx);
      rotate(pool);
    }
  }

  throw new Error(
    `All ${pool.urls.length} RPC endpoints failed for network "${network}" (method: ${method})`,
  );
}

/**
 * Fetch a transaction from the pool, wrapping the raw `getTransaction` JSON-RPC
 * call with automatic endpoint rotation so a single node outage does not block
 * transaction lookups.
 */
export async function fetchTransaction(
  network: NetworkName,
  txHash: string,
): Promise<RpcCallResult<unknown>> {
  return rpcCall(network, "getTransaction", { hash: txHash });
}

/** Convenience: return the URL of the current primary endpoint. */
export function getPrimaryRpcUrl(network: NetworkName): string {
  const pool = state[network];
  return pool.urls[pool.index];
}

/** Snapshot of pool health — useful for observability/dashboards. */
export function getPoolHealth(
  network: NetworkName,
): { url: string; latencyMs: number; errorRate: number; consecutiveFails: number; score: number }[] {
  const pool = state[network];
  return pool.urls.map((url, i) => ({
    url,
    latencyMs:       pool.stats[i].latencyMs,
    errorRate:       pool.stats[i].errorRate,
    consecutiveFails: pool.stats[i].consecutiveFails,
    score:           healthScore(pool.stats[i]),
  }));
}
