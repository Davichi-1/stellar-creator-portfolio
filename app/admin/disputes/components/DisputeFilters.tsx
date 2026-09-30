'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type StatusFilter = 'open' | 'resolved' | 'all';

interface DisputeFiltersProps {
  current: StatusFilter;
  onChange: (filter: StatusFilter) => void;
  total: number;
}

export function DisputeFilters({ current, onChange, total }: DisputeFiltersProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 p-3">
        {(['open', 'resolved', 'all'] as const).map((s) => (
          <Button
            key={s}
            variant={current === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} dispute{total !== 1 ? 's' : ''}
        </span>
      </CardContent>
    </Card>
  );
}
