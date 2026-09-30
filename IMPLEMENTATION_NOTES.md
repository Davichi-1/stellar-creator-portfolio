# Implementation Notes

Technical specs and implementation detail for in-progress backlog items. For
*priority ordering* of what's next, see [`docs/BACKLOG.md`](docs/BACKLOG.md) —
that's the canonical backlog location; this file is its implementation-detail
companion, cross-linked so the two don't drift apart.

## Yield deposit slippage tolerance

**Status:** frontend implemented, contract-side blocked (see `docs/BACKLOG.md`).

Users depositing into a yield vault need to see expected vs. actual shares
before confirming, and a slippage tolerance expressed in basis points
(`max_slippage_bps`) that produces a recommended minimum acceptable share
count:

```
recommended min_shares = expected_shares * (1 - max_slippage_bps / 10_000)
```

- `expected_shares`: shares quoted at the time of the deposit request.
- `max_slippage_bps`: user-configurable tolerance, in basis points (e.g. `50`
  = 0.50%).
- `min_shares`: the value passed to the eventual `deposit_to_yield` contract
  call as the minimum acceptable output; the deposit should revert on-chain
  if actual shares would fall below this.

Frontend implementation:
`components/features/yield/slippage-tolerance-control.tsx` — computes
`min_shares` from the formula above and surfaces expected vs. actual shares.
It's built as a self-contained/presentational component (no contract call
wired in) since `deposit_to_yield` / `max_slippage_bps` don't exist on the
contract side yet. Once that lands, wire its `onConfirm(minShares)` callback
to the actual deposit call.

## SEP-24 anchor flow

**Status:** implemented (Issue #1393).

`lib/stellar/sep24.ts` holds the protocol client — TRANSFER_SERVER discovery
from the anchor's `stellar.toml`, the interactive-URL request, and
`/transaction` polling to a terminal status.

- `components/features/sep24-flow.tsx` runs the full flow client-side.
- `components/sep24-flow.tsx` (the payment form) posts to
  `POST /api/payments/sep24`, which performs the anchor handshake server-side.

The `it.todo` cases in `__tests__/sep24-flow.e2e.test.ts` are filled in, in the
same PR as the implementation, as this note asked.

### Notes for whoever picks this up next

**SEP-10 is not wired.** `app/api/payments/sep24/route.ts` reads its JWT from
`SEP24_AUTH_TOKEN` via `getSep10Token()`. SEP-10 is a challenge/response the
*user's* key must sign, so the token has to come from wherever this deployment
holds that authority — a wallet round-trip, a delegated signer, or a custodial
service. With it unset the route answers 502 with a clear message rather than
sending an unauthenticated request the anchor rejects less legibly. **Wire this
before enabling SEP-24 in production.**

**Terminal statuses are more than `completed` and `error`.** `refunded`,
`expired`, `too_small`, `too_large` and `no_market` are terminal too. Treating
only the obvious two as terminal is what leaves a flow polling forever on a
transfer the anchor has already abandoned — there is a test for each.

**Polling tolerates transient failures.** Three consecutive read failures give
up; a single 502 does not, because an anchor briefly unavailable is not a failed
transfer and abandoning a paid-in one is the worse error. A poll that exhausts
its budget returns the last observed status rather than synthesising an error —
"unresolved" and "rejected" need different things from the user.

### Configuration

```
SEP24_ANCHOR_DOMAIN=testanchor.stellar.org   # TRANSFER_SERVER read from its stellar.toml
SEP24_ASSET_CODE=USDC
SEP24_AUTH_TOKEN=                            # temporary; see SEP-10 note above
```
