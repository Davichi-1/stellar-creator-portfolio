import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paymentFlowSchema } from '@/lib/payment-validation'
import {
  discoverTransferServer,
  Sep24Error,
  startInteractiveFlow,
} from '@/lib/stellar/sep24'

/**
 * POST /api/payments/sep24 — start a SEP-24 interactive transfer (Issue #1393).
 *
 * `components/sep24-flow.tsx` posts its validated form here. The anchor
 * handshake is server-side because the interactive endpoints require a SEP-10
 * JWT, and minting one in the browser would mean shipping the signing key
 * there.
 *
 * Environment:
 *   SEP24_ANCHOR_DOMAIN  — anchor home domain, e.g. `testanchor.stellar.org`.
 *                          TRANSFER_SERVER is read from its stellar.toml.
 *   SEP24_ASSET_CODE     — asset to transfer. Defaults to USDC.
 */

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Re-validated server-side with the same schema the form uses. Client
  // validation is a convenience; it is not a control.
  const parsed = paymentFlowSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const anchorDomain = process.env.SEP24_ANCHOR_DOMAIN
  if (!anchorDomain) {
    // Reported as a 503 rather than a 500: the request was fine, the service is
    // not configured, and those need different responses from an operator.
    return NextResponse.json(
      { error: 'No SEP-24 anchor is configured for this deployment.' },
      { status: 503 },
    )
  }

  const authToken = await getSep10Token(session.user.id)
  if (!authToken) {
    return NextResponse.json(
      { error: 'Could not authenticate with the anchor. Reconnect your wallet.' },
      { status: 502 },
    )
  }

  try {
    const transferServer = await discoverTransferServer(anchorDomain)

    const interactive = await startInteractiveFlow({
      transferServer,
      kind: 'deposit',
      assetCode: process.env.SEP24_ASSET_CODE ?? 'USDC',
      account: parsed.data.recipientAddress,
      authToken,
      amount: String(parsed.data.amount),
    })

    return NextResponse.json({ id: interactive.id, url: interactive.url })
  } catch (err) {
    if (err instanceof Sep24Error) {
      // Pass the anchor's own status through where it is a client-side problem
      // (a 4xx from the anchor usually means the request was wrong); otherwise
      // report a bad gateway, because the failure is upstream of us.
      const status = err.status && err.status >= 400 && err.status < 500 ? 400 : 502
      return NextResponse.json({ error: err.message }, { status })
    }

    console.error('[sep24] unexpected failure starting interactive flow:', err)
    return NextResponse.json({ error: 'Could not start the transfer.' }, { status: 500 })
  }
}

/**
 * Obtains a SEP-10 JWT for the user's account.
 *
 * Not implemented here on purpose. SEP-10 is a challenge/response the *user's*
 * key must sign, so the token has to come from wherever this deployment holds
 * that authority — a wallet round-trip, a delegated signer, or a custodial
 * service. Returning null makes the route answer 502 with a clear message
 * rather than sending an unauthenticated request the anchor will reject with
 * something less legible.
 *
 * Wire this to the existing auth path before enabling SEP-24 in production.
 */
async function getSep10Token(_userId: string): Promise<string | null> {
  return process.env.SEP24_AUTH_TOKEN ?? null
}
