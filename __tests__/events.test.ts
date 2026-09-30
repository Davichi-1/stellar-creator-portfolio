/**
 * Event Bus Unit Tests — Issue #1335
 *
 * Tests for the typed domain event bus:
 *  - Typed event emission and reception
 *  - Error isolation (listener errors don't crash emitter)
 *  - Wildcard subscription (onAnyEvent)
 *  - Webhook subscription registry management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use the REAL event bus (not mocked) for this test file
import bus, {
  emitEvent,
  onEvent,
  onAnyEvent,
  subscribeWebhook,
  unsubscribeWebhook,
  _getWebhookRegistry,
} from '@/backend/services/events';

// Reset between tests by removing all listeners
beforeEach(() => {
  bus.removeAllListeners();
});

describe('Domain Event Bus — Issue #1335', () => {

  // ── Typed event emission ───────────────────────────────────────────────────

  describe('emitEvent / onEvent', () => {
    it('delivers BountyCreated to a registered listener', async () => {
      const received: any[] = [];

      onEvent('BountyCreated', (event) => {
        received.push(event);
      });

      emitEvent('BountyCreated', {
        bountyId: 'b-1',
        creatorId: 'u-1',
        title: 'Test Bounty',
        budget: 500,
        category: 'design',
      });

      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 10));

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('BountyCreated');
      expect(received[0].payload.bountyId).toBe('b-1');
      expect(received[0].eventId).toBeTruthy();
      expect(received[0].createdAt).toBeTruthy();
    });

    it('delivers ApplicationSubmitted to a registered listener', async () => {
      const received: any[] = [];

      onEvent('ApplicationSubmitted', (event) => {
        received.push(event);
      });

      emitEvent('ApplicationSubmitted', {
        applicationId: 'app-1',
        bountyId: 'b-1',
        applicantId: 'u-2',
        proposedBudget: 400,
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(received).toHaveLength(1);
      expect(received[0].payload.applicationId).toBe('app-1');
    });

    it('does not deliver event to wrong listener type', async () => {
      const received: any[] = [];

      onEvent('BountyUpdated', (event) => {
        received.push(event);
      });

      emitEvent('BountyCreated', {
        bountyId: 'b-2',
        creatorId: 'u-1',
        title: 'Another Bounty',
        budget: 1000,
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(received).toHaveLength(0);
    });

    it('delivers to multiple listeners for the same event type', async () => {
      const calls: string[] = [];

      onEvent('UserRegistered', () => { calls.push('listener1'); });
      onEvent('UserRegistered', () => { calls.push('listener2'); });

      emitEvent('UserRegistered', {
        userId: 'u-3',
        email: 'test@example.com',
        name: 'Test',
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(calls).toContain('listener1');
      expect(calls).toContain('listener2');
    });
  });

  // ── Error isolation ────────────────────────────────────────────────────────

  describe('Error isolation', () => {
    it('does not crash when a listener throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodReceived: any[] = [];

      onEvent('BountyCreated', () => {
        throw new Error('Listener error!');
      });
      onEvent('BountyCreated', (event) => {
        goodReceived.push(event);
      });

      expect(() =>
        emitEvent('BountyCreated', {
          bountyId: 'b-err',
          creatorId: 'u-1',
          title: 'Error test',
          budget: 100,
        })
      ).not.toThrow();

      await new Promise((r) => setTimeout(r, 20));

      // Good listener should still receive the event
      expect(goodReceived).toHaveLength(1);
      consoleSpy.mockRestore();
    });
  });

  // ── Wildcard subscription ──────────────────────────────────────────────────

  describe('onAnyEvent (wildcard)', () => {
    it('receives all event types through wildcard subscription', async () => {
      const types: string[] = [];

      onAnyEvent((event) => {
        types.push(event.type);
      });

      emitEvent('BountyCreated', {
        bountyId: 'b-wc',
        creatorId: 'u-1',
        title: 'Wildcard test',
        budget: 200,
      });
      emitEvent('UserRegistered', {
        userId: 'u-wc',
        email: 'wc@example.com',
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(types).toContain('BountyCreated');
      expect(types).toContain('UserRegistered');
    });
  });

  // ── Event shape ───────────────────────────────────────────────────────────

  describe('Event metadata', () => {
    it('emitted events have unique eventIds', async () => {
      const ids: string[] = [];

      onEvent('BountyCreated', (event) => {
        ids.push(event.eventId);
      });

      emitEvent('BountyCreated', { bountyId: 'b-a', creatorId: 'u', title: 'A', budget: 1 });
      emitEvent('BountyCreated', { bountyId: 'b-b', creatorId: 'u', title: 'B', budget: 2 });

      await new Promise((r) => setTimeout(r, 20));

      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('createdAt is a valid ISO-8601 timestamp', async () => {
      let ts: string | undefined;

      onEvent('EscrowCreated', (event) => {
        ts = event.createdAt;
      });

      emitEvent('EscrowCreated', {
        escrowId: 'e-1',
        bountyId: 'b-1',
        payerAddress: 'G...',
        payeeAddress: 'G...',
        amount: 5000,
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(ts).toBeTruthy();
      expect(new Date(ts!).toISOString()).toBe(ts);
    });
  });

  // ── Webhook registry ──────────────────────────────────────────────────────

  describe('Webhook subscription registry', () => {
    it('registers a webhook and returns a subscription object', () => {
      const initialCount = _getWebhookRegistry().length;

      const sub = subscribeWebhook('BountyCreated', 'https://hooks.example.com/bounty');

      expect(sub.id).toBeTruthy();
      expect(sub.eventType).toBe('BountyCreated');
      expect(sub.url).toBe('https://hooks.example.com/bounty');
      expect(_getWebhookRegistry().length).toBe(initialCount + 1);

      // Cleanup
      unsubscribeWebhook(sub.id);
    });

    it('registers wildcard webhook', () => {
      const sub = subscribeWebhook('*', 'https://hooks.example.com/all');
      expect(sub.eventType).toBe('*');
      unsubscribeWebhook(sub.id);
    });

    it('unsubscribes webhook successfully', () => {
      const sub = subscribeWebhook('UserRegistered', 'https://hooks.example.com/users');
      const before = _getWebhookRegistry().length;

      const removed = unsubscribeWebhook(sub.id);
      expect(removed).toBe(true);
      expect(_getWebhookRegistry().length).toBe(before - 1);
    });

    it('returns false when unsubscribing non-existent webhook', () => {
      const removed = unsubscribeWebhook('non-existent-id');
      expect(removed).toBe(false);
    });

    it('stores webhook secret', () => {
      const sub = subscribeWebhook('BountyCreated', 'https://secure.example.com', 'my-secret');
      const stored = _getWebhookRegistry().find((w) => w.id === sub.id);
      expect(stored?.secret).toBe('my-secret');
      unsubscribeWebhook(sub.id);
    });
  });
});
