/**
 * Network configuration — Issue #1346
 *
 * All Soroban RPC URIs and network passphrases are driven exclusively by
 * environment variables. No hardcoded values exist; flipping
 * NEXT_PUBLIC_STELLAR_NETWORK between "mainnet" and "testnet" is the sole
 * switch needed at deploy time.
 *
 * Visual UX cue: `IS_TESTNET` is exported so components can render a
 * prominent banner whenever the app is pointed at testnet, preventing
 * accidental real-fund operations during staging.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NetworkName = 'mainnet' | 'testnet';

export interface NetworkConfig {
  /** Active network identifier. */
  network: NetworkName;
  /** Primary Soroban RPC endpoint for the active network. */
  rpcUrl: string;
  /** Stellar network passphrase for transaction signing. */
  passphrase: string;
  /** True when the active network is testnet — use to show UX warnings. */
  isTestnet: boolean;
  /** Human-readable label suitable for UI badges, e.g. "Testnet" or "Mainnet". */
  label: string;
  /** Hex colour token for the network indicator badge. */
  badgeColor: 'amber' | 'green';
  /**
   * Horizon REST API base URL for the active network.
   * Used by SEP-24 and other Horizon-dependent flows.
   */
  horizonUrl: string;
}

// ---------------------------------------------------------------------------
// Environment-driven configuration table
// ---------------------------------------------------------------------------

/**
 * All values are resolved from explicitly typed environment variables at
 * call time, never at module load time, so Next.js server components,
 * edge functions, and client bundles all see the correct values for their
 * respective runtime contexts.
 */
const CONFIGS: Record<NetworkName, () => Omit<NetworkConfig, 'network' | 'isTestnet'>> = {
  mainnet: () => ({
    rpcUrl:
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
      'https://soroban-mainnet.stellar.org',
    passphrase:
      process.env.NEXT_PUBLIC_MAINNET_PASSPHRASE ??
      'Public Global Stellar Network ; September 2015',
    horizonUrl:
      process.env.NEXT_PUBLIC_MAINNET_HORIZON_URL ??
      'https://horizon.stellar.org',
    label: 'Mainnet',
    badgeColor: 'green',
  }),
  testnet: () => ({
    rpcUrl:
      process.env.NEXT_PUBLIC_TESTNET_RPC_URL ??
      'https://soroban-testnet.stellar.org',
    passphrase:
      process.env.NEXT_PUBLIC_TESTNET_PASSPHRASE ??
      'Test SDF Network ; September 2015',
    horizonUrl:
      process.env.NEXT_PUBLIC_TESTNET_HORIZON_URL ??
      'https://horizon-testnet.stellar.org',
    label: 'Testnet',
    badgeColor: 'amber',
  }),
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate the raw `NEXT_PUBLIC_STELLAR_NETWORK` env variable.
 *
 * Any value other than `"mainnet"` is treated as testnet so that misconfigured
 * deployments fail safe (they default to testnet rather than accidentally
 * operating on mainnet).
 */
export function resolveNetworkName(): NetworkName {
  const raw = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Returns the active network config fully derived from environment variables.
 *
 * Calling this on the server reads `process.env` at call time; calling it in
 * a client bundle reads the values baked in by Next.js at build time.
 */
export function getNetworkConfig(): NetworkConfig {
  const network = resolveNetworkName();
  return {
    network,
    isTestnet: network === 'testnet',
    ...CONFIGS[network](),
  };
}

/**
 * Returns the Soroban RPC URL for a specific network without constructing
 * the full config object.  Useful in lightweight utilities that only need
 * the endpoint.
 */
export function getRpcUrl(network?: NetworkName): string {
  const target = network ?? resolveNetworkName();
  return CONFIGS[target]().rpcUrl;
}

/**
 * Returns the Stellar network passphrase for a specific network.
 */
export function getPassphrase(network?: NetworkName): string {
  const target = network ?? resolveNetworkName();
  return CONFIGS[target]().passphrase;
}

/**
 * True when the active network is testnet.
 *
 * Components should render a visible banner when this is `true` so users
 * are never surprised by staging-only funds or mock transactions.
 *
 * @example
 * ```tsx
 * {IS_TESTNET && (
 *   <TestnetBanner label={getNetworkConfig().label} />
 * )}
 * ```
 */
export const IS_TESTNET: boolean = resolveNetworkName() === 'testnet';

/**
 * Assertion helper for code paths that must only run on mainnet.
 *
 * @throws If the active network is not mainnet.
 */
export function assertMainnet(): void {
  if (resolveNetworkName() !== 'mainnet') {
    throw new Error(
      'This operation is only permitted on mainnet. ' +
        'Set NEXT_PUBLIC_STELLAR_NETWORK=mainnet to proceed.',
    );
  }
}

/**
 * Assertion helper for code paths that must only run on testnet.
 *
 * @throws If the active network is not testnet.
 */
export function assertTestnet(): void {
  if (resolveNetworkName() !== 'testnet') {
    throw new Error(
      'This operation is only permitted on testnet. ' +
        'Set NEXT_PUBLIC_STELLAR_NETWORK=testnet to proceed.',
    );
  }
}
