import { AnalyticsPeriod, DashboardData } from '../types';

// ─── Mock fetcher (replace with real API call) ────────────────────────────────

export function buildMockData(period: AnalyticsPeriod): DashboardData {
  const multiplier = period === '7d' ? 1 : period === '30d' ? 4 : period === '90d' ? 12 : 24;
  const points = period === '7d' ? 7 : period === '30d' ? 8 : period === '90d' ? 6 : 8;

  const labels7d  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels30d = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const labels90d = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const labelsAll = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4'];

  const labelSet =
    period === '7d'  ? labels7d  :
    period === '30d' ? labels30d :
    period === '90d' ? labels90d :
    labelsAll;

  return {
    period,
    metrics: [
      {
        id: 'earnings',
        label: 'Earnings',
        value: 1240 * multiplier,
        previousValue: 980 * multiplier,
        unit: 'XLM',
        trend: 'up',
        trendPct: 26.5,
      },
      {
        id: 'bounties',
        label: 'Bounties',
        value: 4 * multiplier,
        previousValue: 3 * multiplier,
        unit: '',
        trend: 'up',
        trendPct: 33.3,
      },
      {
        id: 'views',
        label: 'Profile Views',
        value: 312 * multiplier,
        previousValue: 280 * multiplier,
        unit: '',
        trend: 'up',
        trendPct: 11.4,
      },
      {
        id: 'rating',
        label: 'Avg Rating',
        value: 4.3,
        previousValue: 4.1,
        unit: '/ 5',
        trend: 'up',
        trendPct: 4.9,
      },
    ],
    earningsChart: Array.from({ length: points }, (_, i) => ({
      label: labelSet[i] ?? String(i + 1),
      value: Math.round(100 + Math.random() * 400 * multiplier),
      secondaryValue: Math.round(80 + Math.random() * 300 * multiplier),
    })),
    bountiesChart: Array.from({ length: points }, (_, i) => ({
      label: labelSet[i] ?? String(i + 1),
      value: Math.round(1 + Math.random() * 5),
    })),
    topSkills: [
      { skill: 'UX Design',    count: 18 },
      { skill: 'Branding',     count: 14 },
      { skill: 'Illustration', count: 11 },
      { skill: 'Motion',       count: 8  },
      { skill: 'Copywriting',  count: 6  },
    ],
    recentActivity: [
      { id: '1', label: 'Bounty completed — Logo Design',    time: '2h ago',  type: 'bounty'  },
      { id: '2', label: 'New review received — 5 stars',     time: '5h ago',  type: 'review'  },
      { id: '3', label: 'Payment received — 250 XLM',        time: '1d ago',  type: 'payment' },
      { id: '4', label: 'Profile viewed by Acme Corp',       time: '2d ago',  type: 'view'    },
      { id: '5', label: 'Application accepted — Brand Kit',  time: '3d ago',  type: 'bounty'  },
    ],
  };
}

export async function fetchDashboard(period: AnalyticsPeriod): Promise<DashboardData> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 600));
  return buildMockData(period);
}

// ─── Period tabs ──────────────────────────────────────────────────────────────

export const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7d',  label: '7D'  },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'All' },
];

// ─── Activity type icon ───────────────────────────────────────────────────────

export const ACTIVITY_ICON: Record<string, string> = {
  bounty:  '📋',
  review:  '⭐',
  payment: '💰',
  view:    '👁️',
};
