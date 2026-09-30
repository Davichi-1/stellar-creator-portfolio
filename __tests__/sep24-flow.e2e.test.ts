/**
 * E2E coverage for the SEP-24 anchor deposit/withdraw flow.
 *
 * These were scoped as `it.todo` ahead of the implementation, with
 * IMPLEMENTATION_NOTES.md asking that they be filled in as part of the same PR
 * as the real anchor call rather than a later follow-up. This is that PR
 * (Issue #1393).
 *
 * The anchor is mocked at `fetch`. That is the seam worth testing: the protocol
 * is entirely defined by which requests go out and what comes back, and an
 * anchor in the loop would make these tests a network-availability check.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  discoverTransferServer,
  fetchTransaction,
  isSuccessStatus,
  isTerminalStatus,
  pollUntilTerminal,
  Sep24Error,
  startInteractiveFlow,
  type Sep24Status,
} from '@/lib/stellar/sep24'

const TRANSFER_SERVER = 'https://anchor.test/sep24'
const AUTH_TOKEN = 'sep10-jwt'
const TX_ID = 'tx-abc123'

const TOML = `
VERSION = "2.0.0"
TRANSFER_SERVER = "https://anchor.test/sep6"
TRANSFER_SERVER_SEP0024 = "${TRANSFER_SERVER}"
`

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as Response
}

/** Builds a transaction record at a given status. */
function transaction(status: Sep24Status, extra: Record<string, unknown> = {}) {
  return {
    transaction: { id: TX_ID, kind: 'deposit', status, ...extra },
  }
}

describe('E2E: SEP-24 anchor flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mocked-anchor happy path: requesting the interactive URL, completing the anchor flow, and polling reaches a `completed` transaction status', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>

    fetchMock
      // 1. stellar.toml discovery
      .mockResolvedValueOnce(textResponse(TOML))
      // 2. POST /transactions/deposit/interactive
      .mockResolvedValueOnce(
        jsonResponse({
          type: 'interactive_customer_info_needed',
          url: 'https://anchor.test/interactive?token=xyz',
          id: TX_ID,
        }),
      )
      // 3. polling: the anchor works through its states before settling
      .mockResolvedValueOnce(jsonResponse(transaction('incomplete')))
      .mockResolvedValueOnce(jsonResponse(transaction('pending_anchor')))
      .mockResolvedValueOnce(jsonResponse(transaction('pending_stellar')))
      .mockResolvedValueOnce(
        jsonResponse(
          transaction('completed', {
            amount_out: '100.00',
            stellar_transaction_id: 'stellar-hash',
          }),
        ),
      )

    const transferServer = await discoverTransferServer('anchor.test')
    // SEP0024 override wins over the plain TRANSFER_SERVER — sending a SEP-24
    // request to a SEP-6 endpoint reaches an API speaking another protocol.
    expect(transferServer).toBe(TRANSFER_SERVER)

    const interactive = await startInteractiveFlow({
      transferServer,
      kind: 'deposit',
      assetCode: 'USDC',
      account: 'GTEST',
      authToken: AUTH_TOKEN,
      amount: '100',
    })

    expect(interactive.id).toBe(TX_ID)
    expect(interactive.url).toContain('interactive')

    // The interactive request must be authenticated and hit the right path.
    const [initUrl, initInit] = fetchMock.mock.calls[1]
    expect(initUrl).toBe(`${TRANSFER_SERVER}/transactions/deposit/interactive`)
    expect((initInit as RequestInit).method).toBe('POST')
    expect(
      ((initInit as RequestInit).headers as Record<string, string>).Authorization,
    ).toBe(`Bearer ${AUTH_TOKEN}`)

    const seen: Sep24Status[] = []
    const polling = pollUntilTerminal({
      transferServer,
      id: TX_ID,
      authToken: AUTH_TOKEN,
      intervalMs: 1_000,
      onUpdate: (tx) => seen.push(tx.status),
    })

    await vi.advanceTimersByTimeAsync(5_000)
    const final = await polling

    expect(final.status).toBe('completed')
    expect(isSuccessStatus(final.status)).toBe(true)
    expect(final.amount_out).toBe('100.00')
    // Every intermediate state was observed, which is what a progress UI needs.
    expect(seen).toEqual([
      'incomplete',
      'pending_anchor',
      'pending_stellar',
      'completed',
    ])
  })

  it('failure/rejection path: the anchor returns an error (or the user is redirected back with a rejected/incomplete status) and the flow surfaces that as an `error` status rather than hanging in `pending_anchor`', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>

    // Case A — the anchor refuses the request outright, with a reason.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'This anchor does not support USDC withdrawals' }, 400),
    )

    await expect(
      startInteractiveFlow({
        transferServer: TRANSFER_SERVER,
        kind: 'withdraw',
        assetCode: 'USDC',
        account: 'GTEST',
        authToken: AUTH_TOKEN,
      }),
    ).rejects.toThrow(/does not support USDC withdrawals/)

    // Case B — the flow starts, then the anchor rejects during processing.
    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(transaction('pending_anchor')))
      .mockResolvedValueOnce(
        jsonResponse(transaction('error', { message: 'KYC verification failed' })),
      )

    const polling = pollUntilTerminal({
      transferServer: TRANSFER_SERVER,
      id: TX_ID,
      authToken: AUTH_TOKEN,
      intervalMs: 1_000,
    })

    await vi.advanceTimersByTimeAsync(2_000)
    const rejected = await polling

    // The point of the test: it settles on `error` instead of polling forever
    // in `pending_anchor`.
    expect(rejected.status).toBe('error')
    expect(isTerminalStatus(rejected.status)).toBe(true)
    expect(isSuccessStatus(rejected.status)).toBe(false)
    expect(rejected.message).toBe('KYC verification failed')
  })

  it('stops polling on the rejection statuses that are not `error`', async () => {
    // `refunded`, `expired`, `too_small`, `too_large` and `no_market` are all
    // terminal. Treating only completed/error as terminal is what leaves a
    // flow spinning on a transfer the anchor already abandoned.
    for (const status of ['refunded', 'expired', 'too_small', 'no_market'] as Sep24Status[]) {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockReset()
      fetchMock.mockResolvedValue(jsonResponse(transaction(status)))

      const polling = pollUntilTerminal({
        transferServer: TRANSFER_SERVER,
        id: TX_ID,
        authToken: AUTH_TOKEN,
        intervalMs: 1_000,
      })

      await vi.advanceTimersByTimeAsync(1_000)
      const result = await polling

      expect(result.status).toBe(status)
      expect(isSuccessStatus(result.status)).toBe(false)
      // One read, not a loop.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  })

  it('rides out a transient anchor failure rather than abandoning a paid-in transfer', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>

    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse(transaction('completed')))

    const polling = pollUntilTerminal({
      transferServer: TRANSFER_SERVER,
      id: TX_ID,
      authToken: AUTH_TOKEN,
      intervalMs: 1_000,
    })

    await vi.advanceTimersByTimeAsync(4_000)

    // An anchor briefly 502ing is not a failed transfer.
    await expect(polling).resolves.toMatchObject({ status: 'completed' })
  })

  it('gives up after three consecutive read failures', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(jsonResponse({}, 500))

    const polling = pollUntilTerminal({
      transferServer: TRANSFER_SERVER,
      id: TX_ID,
      authToken: AUTH_TOKEN,
      intervalMs: 1_000,
    })
    const assertion = expect(polling).rejects.toThrow(Sep24Error)

    await vi.advanceTimersByTimeAsync(4_000)
    await assertion
  })

  it('reports the last known status when the poll budget runs out', async () => {
    // Timing out is not the same as failing — the transfer may still complete,
    // and the caller needs "unresolved" rather than "rejected".
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(jsonResponse(transaction('pending_external')))

    const polling = pollUntilTerminal({
      transferServer: TRANSFER_SERVER,
      id: TX_ID,
      authToken: AUTH_TOKEN,
      intervalMs: 1_000,
      timeoutMs: 3_000,
    })

    await vi.advanceTimersByTimeAsync(5_000)
    const result = await polling

    expect(result.status).toBe('pending_external')
    expect(isTerminalStatus(result.status)).toBe(false)
  })

  it('rejects an anchor that advertises no SEP-24 transfer server', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(textResponse('VERSION = "2.0.0"\n'))

    await expect(discoverTransferServer('anchor.test')).rejects.toThrow(
      /does not advertise a SEP-24 TRANSFER_SERVER/,
    )
  })

  it('rejects an interactive response missing url or id', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ type: 'interactive_customer_info_needed' }))

    await expect(
      startInteractiveFlow({
        transferServer: TRANSFER_SERVER,
        kind: 'deposit',
        assetCode: 'USDC',
        account: 'GTEST',
        authToken: AUTH_TOKEN,
      }),
    ).rejects.toThrow(/missing `url` or `id`/)
  })

  it('sends the transaction id as a query parameter when reading status', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse(transaction('completed')))

    await fetchTransaction({
      transferServer: TRANSFER_SERVER,
      id: 'tx with spaces',
      authToken: AUTH_TOKEN,
    })

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${TRANSFER_SERVER}/transaction?id=tx%20with%20spaces`,
    )
  })
})
