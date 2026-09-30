'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Gavel, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';

interface Dispute {
  id: string;
  escrowId: string;
  creatorId: string;
  clientId: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

type Resolution = 'release_to_freelancer' | 'refund_to_creator' | 'split_50_50';

const RESOLUTION_LABELS: Record<Resolution, string> = {
  release_to_freelancer: 'Release to Freelancer',
  refund_to_creator: 'Refund to Creator',
  split_50_50: 'Split 50/50',
};

function ageLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs > 0) return `${hrs}h ago`;
  return 'just now';
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/disputes?status=${statusFilter}&page=${page}&limit=${LIMIT}`,
      );
      if (!res.ok) throw new Error('Failed to load disputes');
      const data = await res.json();
      setDisputes(data.disputes);
      setTotal(data.total);
    } catch {
      notify('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const selected = disputes.find((d) => d.id === selectedId) ?? null;

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function resolve(resolution: Resolution) {
    if (!selected) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${selected.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to resolve');
      }
      notify(`Resolved: ${RESOLUTION_LABELS[resolution]}`);
      setNote('');
      setSelectedId(null);
      await load();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Error resolving dispute');
    } finally {
      setResolving(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <Toast message={toast ?? ''} />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ArrowLeft className="mr-1 h-4 w-4" />Admin</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Dispute Management
          </CardTitle>
          <CardDescription>
            Review disputes and trigger on-chain resolution. All actions are logged to the audit trail.
          </CardDescription>
        </CardHeader>
      </Card>

      <DisputeFilters
        current={statusFilter}
        onChange={(s) => { setStatusFilter(s); setPage(1); setSelectedId(null); }}
        total={total}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DisputeList
          disputes={disputes}
          loading={loading}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setNote(''); }}
          totalPages={totalPages}
          currentPage={page}
          onPageChange={setPage}
        />

        <DisputeDetail
          dispute={selected}
          note={note}
          onNoteChange={setNote}
          onResolve={resolve}
          resolving={resolving}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cases</CardTitle>
            <CardDescription>Select a dispute to review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))
            ) : disputes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No disputes found.</p>
            ) : (
              disputes.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setSelectedId(d.id); setNote(''); }}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                    selectedId === d.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <StatusBadge status={d.status} className="text-[10px]" />
                    <span className="text-xs text-muted-foreground">{ageLabel(d.createdAt)}</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground truncate">{d.id}</div>
                  <div className="text-xs mt-1 truncate">Escrow: {d.escrowId}</div>
                </button>
              ))
            )}
          </CardContent>
          {totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              label={`${page} / ${totalPages}`}
              align="center"
              className="px-4 pb-4"
            />
          )}
        </Card>

        {/* Detail + Resolution */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dispute Detail</CardTitle>
            <CardDescription>
              {selected ? `ID: ${selected.id}` : 'Select a dispute from the list'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">No dispute selected.</p>
            ) : (
              <>
                {/* Evidence / context */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Status</dt>
                    <dd>
                      <StatusBadge status={selected.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Age</dt>
                    <dd>{ageLabel(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Escrow ID</dt>
                    <dd className="font-mono text-xs truncate">{selected.escrowId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Creator (party A)</dt>
                    <dd className="font-mono text-xs truncate">{selected.creatorId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Client (party B)</dt>
                    <dd className="font-mono text-xs truncate">{selected.clientId}</dd>
                  </div>
                  {selected.reason && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground mb-0.5">Reason / Resolution</dt>
                      <dd>{selected.reason}</dd>
                    </div>
                  )}
                </dl>

                {selected.status === 'open' && (
                  <>
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-sm font-medium">Resolution Actions</p>
                      <p className="text-xs text-muted-foreground">
                        Each action calls <code className="font-mono">resolve_dispute()</code> on-chain
                        and writes an AuditLog entry.
                      </p>
                      <Textarea
                        placeholder="Optional admin note (logged to audit trail)"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={resolving}
                        aria-label="Admin note"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(RESOLUTION_LABELS) as [Resolution, string][]).map(
                          ([key, label]) => (
                            <Button
                              key={key}
                              size="sm"
                              disabled={resolving}
                              variant={key === 'release_to_freelancer' ? 'default' : 'outline'}
                              onClick={() => resolve(key)}
                            >
                              {label}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selected.status !== 'open' && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      This dispute has been <strong>{selected.status}</strong>.{' '}
                      {selected.reason && `Resolution: ${selected.reason}.`}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
