/**
 * ActivityTimelineService
 *
 * Manages activity timeline data with optimized performance and caching.
 * Provides native 60fps rendering support.
 */

import { ActivityEvent, ActivityEventType, ActivitySummary, ActivityFilterType } from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_PAGE_SIZE = 20;
const PAGE_SIZE = 30;
const CACHE_TTL = 30000; // 30 seconds

// ─── Mock Data Generators ──────────────────────────────────────────────────────

const EVENT_TYPES: ActivityEventType[] = [
  'bounty_posted', 'bounty_applied', 'bounty_accepted', 'bounty_rejected', 'bounty_completed',
  'review_received', 'review_left', 'payment_received', 'payment_sent',
  'message_received', 'profile_viewed', 'match_found', 'dispute_opened', 'dispute_resolved',
];

const MOCK_NAMES = [
  'Alice Chen', 'Bob Martinez', 'Sarah Johnson', 'David Kim', 'Emma Wilson',
  'Michael Brown', 'Jennifer Lee', 'James Davis', 'Lisa Garcia', 'Robert Taylor',
];

const MOCK_TITLES = {
  bounty_posted: ['Mobile App Design', 'Backend API Integration', 'UI/UX Redesign', 'Smart Contract Audit'],
  bounty_applied: ['Application for Mobile App', 'Proposal: API Integration', 'Bid for UI Redesign'],
  bounty_accepted: ['Accepted: Mobile App Design', 'Contract Signed: API Integration'],
  bounty_rejected: ['Rejected: Advanced Features'],
  bounty_completed: ['Completed: Mobile App Design', 'Delivered: UI/UX Redesign'],
  review_received: ['Review from Alice Chen', '5-star rating received'],
  review_left: ['Reviewed: Bob Martinez', 'Submitted review for project'],
  payment_received: ['Payment received: $250 XLM', 'Earnings: $500 XLM'],
  payment_sent: ['Payment sent: $100 XLM', 'Escrow release: $300 XLM'],
  message_received: ['New message from Alice', 'Direct message received'],
  profile_viewed: ['Profile viewed by Bob', 'Creator profile accessed'],
  match_found: ['New match found', 'Perfect match for your skills'],
  dispute_opened: ['Dispute opened', 'Payment dispute initiated'],
  dispute_resolved: ['Dispute resolved', 'Payment dispute settled'],
};

// ─── Service Class ─────────────────────────────────────────────────────────────

export class ActivityTimelineService {
  private events: ActivityEvent[] = [];
  private cache: Map<string, { data: ActivityEvent[]; timestamp: number }> = new Map();
  private lastFetch: number = 0;

  // ─── Constructor ───────────────────────────────────────────────────────────

  constructor(initialEvents: ActivityEvent[] = []) {
    this.events = initialEvents;
  }

  // ─── Data Management ─────────────────────────────────────────────────────

  /** Get all events */
  getEvents(): ActivityEvent[] {
    return [...this.events];
  }

  /** Add event */
  addEvent(event: ActivityEvent): void {
    this.events = [event, ...this.events];
    this.cache.clear();
  }

  /** Mark event as read */
  markAsRead(eventId: string): void {
    this.events = this.events.map(e =>
      e.id === eventId ? { ...e, read: true } : e
    );
    this.cache.clear();
  }

  /** Mark all events as read */
  markAllAsRead(): void {
    this.events = this.events.map(e => ({ ...e, read: true }));
    this.cache.clear();
  }

  /** Clear events */
  clear(): void {
    this.events = [];
    this.cache.clear();
  }

  // ─── Filtering ─────────────────────────────────────────────────────────────

  /** Filter events by type */
  filterByType(events: ActivityEvent[], type: ActivityFilterType): ActivityEvent[] {
    const typeMap: Record<ActivityFilterType, ActivityEventType[] | null> = {
      all: null,
      bounties: ['bounty_posted', 'bounty_applied', 'bounty_accepted', 'bounty_rejected', 'bounty_completed'],
      reviews: ['review_received', 'review_left'],
      payments: ['payment_received', 'payment_sent'],
      messages: ['message_received'],
      applications: ['bounty_applied', 'bounty_accepted', 'bounty_rejected'],
    };

    const allowedTypes = typeMap[type];
    return allowedTypes ? events.filter(e => allowedTypes.includes(e.type)) : events;
  }

  // ─── Summary Calculation ───────────────────────────────────────────────────

  /** Calculate summary from events */
  calculateSummary(events: ActivityEvent[]): ActivitySummary {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let weeklyEarnings = 0;
    let weeklyBounties = 0;

    events.forEach(e => {
      if (e.createdAt && new Date(e.createdAt) >= weekAgo) {
        if (e.amount) {
          weeklyEarnings += e.amount;
        }
        if (e.type.startsWith('bounty_') && e.type !== 'bounty_applied' && e.type !== 'bounty_rejected') {
          weeklyBounties++;
        }
      }
    });

    return {
      totalEvents: events.length,
      unreadCount: events.filter(e => !e.read).length,
      weeklyEarnings,
      weeklyBounties,
    };
  }

  // ─── Section Grouping ──────────────────────────────────────────────────────

  /** Group events into timeline sections */
  groupIntoSections(events: ActivityEvent[]): Record<string, ActivityEvent[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const buckets: Record<string, ActivityEvent[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    events.forEach(evt => {
      const d = new Date(evt.createdAt);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day >= today) {
        buckets.today.push(evt);
      } else if (day >= yesterday) {
        buckets.yesterday.push(evt);
      } else if (day >= weekAgo) {
        buckets.thisWeek.push(evt);
      } else {
        buckets.older.push(evt);
      }
    });

    return buckets;
  }

  // ─── Mock Data Generation ──────────────────────────────────────────────────

  /** Generate mock events */
  generateMockEvents(count: number = 50): ActivityEvent[] {
    const events: ActivityEvent[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
      const titles = MOCK_TITLES[type] || ['Activity'];
      const title = titles[Math.floor(Math.random() * titles.length)];

      events.push({
        id: `evt-${i}`,
        type,
        title,
        subtitle: type === 'bounty_posted' ? `Logo design for Tamgora platform` : undefined,
        amount: [4, 7, 11].includes(i % 12) ? 250 + i * 10 : undefined,
        relatedId: `item-${i}`,
        relatedName: ['Alice Chen', 'Stellar Bounty #42', 'Bob Martinez', undefined][i % 4] ?? undefined,
        avatarUrl: undefined,
        read: i > 15,
        createdAt: new Date(now - i * 3600000 * 6).toISOString(),
      });
    }

    return events;
  }

  // ─── API Integration ───────────────────────────────────────────────────────

  /** Fetch events from API (placeholder) */
  async fetchEvents(limit: number = PAGE_SIZE, offset: number = 0): Promise<ActivityEvent[]> {
    const cacheKey = `events_${limit}_${offset}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const events = this.generateMockEvents(limit);
    this.cache.set(cacheKey, { data: events, timestamp: Date.now() });

    return events;
  }

  /** Fetch paginated events */
  async fetchPaginated(page: number = 1, filter: ActivityFilterType = 'all'): Promise<ActivityEvent[]> {
    const offset = (page - 1) * PAGE_SIZE;
    const events = await this.fetchEvents(PAGE_SIZE, offset);

    return this.filterByType(events, filter);
  }

  /** Get summary (cached) */
  async getSummary(): Promise<ActivitySummary> {
    const cacheKey = 'summary';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as ActivitySummary;
    }

    const summary = this.calculateSummary(this.events);
    this.cache.set(cacheKey, { data: summary, timestamp: Date.now() });

    return summary;
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const activityTimelineService = new ActivityTimelineService();
