// ─── URL builder ──────────────────────────────────────────────────────────────

/**
 * Builds a deep-link URL for sharing or programmatic navigation.
 *
 * @example
 *   buildDeepLink('creator', 'alex-studio')
 *   // → 'stellar://creator/alex-studio'
 */
export function buildDeepLink(...segments: string[]): string {
  return `stellar://${segments.filter(Boolean).join("/")}`;
}

/**
 * Builds a universal (HTTPS) link for sharing outside the app.
 *
 * @example
 *   buildUniversalLink('creator', 'alex-studio')
 *   // → 'https://stellar.app/creator/alex-studio'
 */
export function buildUniversalLink(...segments: string[]): string {
  return `https://stellar.app/${segments.filter(Boolean).join("/")}`;
}
