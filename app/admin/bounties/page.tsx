'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Flag, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import {
  mockBounties, mockAuditLogs, addAuditLog,
  type AdminBounty, type BountyStatus, type AuditLog,
} from '@/lib/services/admin-service';
import { StatusBadge } from '@/components/ui/status-badge';

export default function AdminBountiesPage() {
  const [bounties, setBounties] = useState<AdminBounty[]>(mockBounties);
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function log(action: Parameters<typeof addAuditLog>[1], bounty: AdminBounty, note?: string) {
    setLogs((prev) => addAuditLog(prev, action, bounty.id, bounty.title, note));
  }

  const filtered = useMemo(() => {
    return bounties.filter((b) => {
      const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.postedBy.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bounties, search, statusFilter]);

  function updateBounty(id: string, patch: Partial<AdminBounty>) {
    setBounties((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }

  function flagBounty(bounty: AdminBounty) {
    updateBounty(bounty.id, { status: 'flagged', flagReason: 'Flagged by admin for review' });
    log('bounty.flag', bounty);
    notify(`"${bounty.title}" flagged.`);
  }

  function approveBounty(bounty: AdminBounty) {
    updateBounty(bounty.id, { status: 'open', flagReason: undefined });
    log('bounty.approve', bounty);
    notify(`"${bounty.title}" approved.`);
  }

  function deleteBounty(bounty: AdminBounty) {
    setBounties((prev) => prev.filter((b) => b.id !== bounty.id));
    log('bounty.delete', bounty);
    notify(`"${bounty.title}" deleted.`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkDelete() {
    const targets = bounties.filter((b) => selected.has(b.id));
    targets.forEach((b) => log('bounty.delete', b, 'Bulk action'));
    setBounties((prev) => prev.filter((b) => !selected.has(b.id)));
    setSelected(new Set());
    notify(`${targets.length} bounties deleted.`);
  }

  const flaggedCount = bounties.filter((b) => b.status === 'flagged').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Bounty Moderation</h1>
        <p className="text-muted-foreground text-sm">{bounties.length} total bounties</p>
      </div>

      {toast && (
        <div className="px-4 py-3 rounded-lg bg-primary/10 text-primary text-sm border border-primary/20">{toast}</div>
      )}

      {flaggedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm">
          <AlertTriangle size={16} aria-hidden="true" className="text-red-500 shrink-0" />
          <span className="font-medium text-red-600">{flaggedCount} flagged bounti{flaggedCount > 1 ? 'es' : 'y'} need review</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search bounties..." aria-label="Search bounties" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="flagged">Flagged</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary border border-border text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>Delete all</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="px-4 py-3 text-left w-8">
                    <input type="checkbox" aria-label="Select all bounties" onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((b) => b.id)) : new Set())} />
                  </th>
                  <th className="px-4 py-3 text-left">Bounty</th>
                  <th className="px-4 py-3 text-left">Posted By</th>
                  <th className="px-4 py-3 text-left">Budget</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Applicants</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bounty) => (
                  <>
                    <tr key={bounty.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" aria-label={`Select ${bounty.title}`} checked={selected.has(bounty.id)} onChange={() => toggleSelect(bounty.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{bounty.title}</div>
                        <div className="text-xs text-muted-foreground">{bounty.category} · {bounty.postedAt}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{bounty.postedBy}</td>
                      <td className="px-4 py-3 font-medium">${bounty.budget.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={bounty.status} />
                      </td>
                      <td className="px-4 py-3">{bounty.applicants}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {bounty.status === 'flagged' ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => approveBounty(bounty)}>
                              <CheckCircle size={12} aria-hidden="true" /> Approve
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => flagBounty(bounty)}>
                              <Flag size={12} aria-hidden="true" /> Flag
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" aria-label={`Delete ${bounty.title}`} onClick={() => deleteBounty(bounty)}>
                            <Trash2 size={12} aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {bounty.flagReason && (
                      <tr key={`${bounty.id}-flag`} className="border-b border-border bg-red-500/5">
                        <td colSpan={7} className="px-4 py-2 text-xs text-red-600 flex items-center gap-1.5">
                          <AlertTriangle size={12} aria-hidden="true" /> {bounty.flagReason}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <div className="text-center space-y-3">
                        <p className="text-muted-foreground text-sm">No bounties match your filters.</p>
                        <div className="flex items-center justify-center gap-2">
                          {(search || statusFilter !== 'All') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSearch('');
                                  setStatusFilter('All');
                                }}
                              >
                                Clear Filters
                              </Button>
                              <span className="text-xs text-muted-foreground">or</span>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = '/'}
                          >
                            View on Marketplace
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
