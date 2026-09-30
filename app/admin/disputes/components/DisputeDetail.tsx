'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { ageLabel, RESOLUTION_LABELS, type Dispute, type Resolution } from './types';

interface DisputeDetailProps {
  dispute: Dispute | null;
  note: string;
  onNoteChange: (note: string) => void;
  onResolve: (resolution: Resolution) => void;
  resolving: boolean;
}

export function DisputeDetail({
  dispute, note, onNoteChange, onResolve, resolving,
}: DisputeDetailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dispute Detail</CardTitle>
        <CardDescription>
          {dispute ? `ID: ${dispute.id}` : 'Select a dispute from the list'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!dispute ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No dispute selected.
          </p>
        ) : (
          <>
            {/* Evidence / context */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status</span>
                <StatusBadge status={dispute.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Age: </span>{ageLabel(dispute.createdAt)}</div>
                <div><span className="text-muted-foreground">Escrow ID: </span>{dispute.escrowId}</div>
                <div><span className="text-muted-foreground">Creator (party A): </span>{dispute.creatorId}</div>
                <div><span className="text-muted-foreground">Client (party B): </span>{dispute.clientId}</div>
              </div>
              {dispute.reason && (
                <div>
                  <span className="text-sm font-medium">Reason / Resolution</span>
                  <p className="mt-1 text-sm text-muted-foreground">{dispute.reason}</p>
                </div>
              )}
            </div>

            {dispute.status === 'open' && (
              <>
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold">Resolution Actions</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Each action calls resolve_dispute() on-chain and writes an AuditLog entry.
                  </p>
                  <Textarea
                    className="mt-3"
                    placeholder="Admin note (optional)…"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    disabled={resolving}
                    aria-label="Admin note"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.entries(RESOLUTION_LABELS) as [Resolution, string][]).map(
                      ([key, label]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant="outline"
                          disabled={resolving}
                          onClick={() => onResolve(key)}
                        >
                          {label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}

            {dispute.status !== 'open' && (
              <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
                <p>
                  This dispute has been {dispute.status}.{' '}
                  {dispute.reason && `Resolution: ${dispute.reason}.`}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
