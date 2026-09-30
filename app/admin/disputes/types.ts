export interface Dispute {
  id: string;
  escrowId: string;
  creatorId: string;
  clientId: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Resolution = 'release_to_freelancer' | 'refund_to_creator' | 'split_50_50';

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  release_to_freelancer: 'Release to Freelancer',
  refund_to_creator: 'Refund to Creator',
  split_50_50: 'Split 50/50',
};

export function ageLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs > 0) return `${hrs}h ago`;
  return 'just now';
}
