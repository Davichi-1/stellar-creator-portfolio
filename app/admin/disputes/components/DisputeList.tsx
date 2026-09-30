'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { ageLabel, type Dispute } from './types';

interface DisputeListProps {
  disputes: Dispute[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function DisputeList({
  disputes, loading, selectedId, onSelect, totalPages, currentPage, onPageChange,
}: DisputeListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cases</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">Select a dispute to review</p>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : disputes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No disputes found.
          </p>
        ) : (
          disputes.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                selectedId === d.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <StatusBadge status={d.status} />
                <span className="text-xs text-muted-foreground">
                  {ageLabel(d.createdAt)}
                </span>
              </div>
              <p className="mt-1 font-medium">{d.id}</p>
              <p className="text-xs text-muted-foreground">Escrow: {d.escrowId}</p>
            </button>
          ))
        )}

        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
