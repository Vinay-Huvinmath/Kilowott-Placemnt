import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { SkeletonRow } from '../components/Skeleton.js';
import { formatRelativeTime } from '../lib/format.js';

type SourceFilter = 'all' | 'manual' | 'workflow' | 'ai';

export function Messages() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const { data: communications, loading, refetch } = useApi(
    () => api.communications.list(),
    []
  );

  // Poll every 8s per specification
  useEffect(() => {
    document.title = 'Messages | Pulse';
    const timer = setInterval(() => {
      refetch();
    }, 8000);
    return () => clearInterval(timer);
  }, [refetch]);

  const sourceTabs: Array<{ label: string; value: SourceFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'You', value: 'manual' },
    { label: 'Automation', value: 'workflow' },
    { label: 'Drafted', value: 'ai' }
  ];

  const filtered = useMemo(() => {
    if (!communications) return [];
    if (sourceFilter === 'all') return communications;
    return communications.filter(c => c.source === sourceFilter);
  }, [communications, sourceFilter]);

  const getSourceStamp = (source: string) => {
    switch (source) {
      case 'workflow':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-deepgreen flex-shrink-0" />
            <span>Automation</span>
          </span>
        );
      case 'ai':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta flex-shrink-0" />
            <span>Drafted</span>
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0" />
            <span>You</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-hairline pb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight">
            Messages
          </h1>
          <p className="text-xs text-muted-ink mt-0.5">
            Chronological ledger of notes, dispatches, and automated touches
          </p>
        </div>
        <div className="text-xs font-mono text-muted-ink tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
        </div>
      </div>

      {/* Filter by source via plain text tabs */}
      <div className="flex items-center gap-5 overflow-x-auto pb-1 text-xs">
        {sourceTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSourceFilter(tab.value)}
            className={`pb-1 whitespace-nowrap transition-colors duration-150 ${
              sourceFilter === tab.value
                ? 'text-ink font-semibold border-b-2 border-ink'
                : 'text-muted-ink hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-hairline rounded-[6px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-paper/40 text-[11px] uppercase tracking-wider text-muted-ink font-medium">
              <th className="py-2.5 px-4 font-medium">Customer</th>
              <th className="py-2.5 px-4 font-medium">Channel</th>
              <th className="py-2.5 px-4 font-medium">Subject</th>
              <th className="py-2.5 px-4 font-medium">Source</th>
              <th className="py-2.5 px-4 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading && !communications && (
              <tr>
                <td colSpan={5} className="p-4">
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-muted-ink">
                  No messages yet. Send the first one from a customer page.
                </td>
              </tr>
            )}

            {filtered.map(comm => (
              <tr
                key={comm.id}
                className="hover:bg-paper/40 transition-colors duration-150"
              >
                <td className="py-3 px-4 font-medium text-ink">
                  {comm.customer ? (
                    <Link
                      to={`/customers/${comm.customer.id}`}
                      className="hover:underline"
                    >
                      {comm.customer.name}
                    </Link>
                  ) : (
                    'Store Patron'
                  )}
                  <span className="block text-[11px] text-muted-ink font-normal">
                    {comm.customer?.city || 'Panjim'}
                  </span>
                </td>

                <td className="py-3 px-4 uppercase font-mono text-[10px] text-muted-ink">
                  {comm.type}
                </td>

                <td className="py-3 px-4 max-w-md">
                  <p className="font-medium text-ink text-[11px] mb-0.5">
                    {comm.subject || 'Direct communication'}
                  </p>
                  <p className="text-muted-ink truncate text-[11px] leading-relaxed font-sans">
                    {comm.message}
                  </p>
                </td>

                <td className="py-3 px-4">
                  {getSourceStamp(comm.source)}
                </td>

                <td className="py-3 px-4 text-right text-muted-ink font-mono tabular-nums text-[11px]">
                  {formatRelativeTime(comm.sentAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
