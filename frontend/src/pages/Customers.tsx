import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { SegmentStamp } from '../components/SegmentStamp.js';
import { SkeletonRow } from '../components/Skeleton.js';
import { formatINR, formatRelativeTime } from '../lib/format.js';
import { CustomerSummary } from '../types.js';

type SortField = 'spent' | 'lastOrder';
type SortOrder = 'desc' | 'asc';

export function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('spent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    document.title = 'Customers | Pulse';
  }, []);

  const { data: rawCustomers, loading, error } = useApi(
    () => api.customers.list(),
    []
  );

  const segments = ['all', 'VIP', 'At Risk', 'Loyal', 'Regular', 'New'];

  const filteredAndSorted = useMemo(() => {
    if (!rawCustomers) return [];

    let result = rawCustomers.filter(c => {
      if (selectedSegment !== 'all' && c.segment !== selectedSegment) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        return matchesName || matchesCity || matchesEmail;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortField === 'spent') {
        const diff = a.totalSpend - b.totalSpend;
        return sortOrder === 'desc' ? -diff : diff;
      }
      if (sortField === 'lastOrder') {
        const timeA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const timeB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        const diff = timeA - timeB;
        return sortOrder === 'desc' ? -diff : diff;
      }
      return 0;
    });

    return result;
  }, [rawCustomers, selectedSegment, search, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return 'bg-deepgreen';
    if (score >= 60) return 'bg-deepgreen/80';
    if (score >= 40) return 'bg-mustard';
    return 'bg-terracotta';
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight">
            Customers
          </h1>
          <p className="text-xs text-muted-ink mt-0.5">
            Store patrons ledger with order totals and relationship health
          </p>
        </div>
        <div className="text-xs font-mono text-muted-ink tabular-nums">
          {rawCustomers ? `${rawCustomers.length} total patrons` : ''}
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Segment filter as plain text tabs */}
        <div className="flex items-center gap-5 overflow-x-auto pb-1 text-xs">
          {segments.map(seg => {
            const isSelected = selectedSegment === seg;
            return (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg)}
                className={`transition-colors duration-150 capitalize pb-1 whitespace-nowrap ${
                  isSelected
                    ? 'text-ink font-semibold border-b-2 border-ink'
                    : 'text-muted-ink hover:text-ink'
                }`}
              >
                {seg === 'all' ? 'All patrons' : seg}
              </button>
            );
          })}
        </div>

        {/* Search box */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-ink stroke-[1.5]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-hairline rounded-[4px] text-ink placeholder:text-muted-ink focus:outline-none focus:border-ink font-sans"
          />
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-surface border border-hairline rounded-[6px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-paper/40 text-[11px] uppercase tracking-wider text-muted-ink font-medium">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Segment</th>
              <th className="py-2.5 px-4 font-medium text-right">Orders</th>
              <th
                onClick={() => toggleSort('spent')}
                className="py-2.5 px-4 font-medium text-right cursor-pointer hover:text-ink select-none"
              >
                <div className="inline-flex items-center gap-1 justify-end">
                  <span>Spent</span>
                  <ArrowUpDown className="w-3 h-3 stroke-[1.5]" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('lastOrder')}
                className="py-2.5 px-4 font-medium cursor-pointer hover:text-ink select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Last order</span>
                  <ArrowUpDown className="w-3 h-3 stroke-[1.5]" />
                </div>
              </th>
              <th className="py-2.5 px-4 font-medium">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading && (
              <tr>
                <td colSpan={6} className="p-4">
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </td>
              </tr>
            )}

            {!loading && filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-muted-ink">
                  No customers match this filter. Clear search to view all patrons.
                </td>
              </tr>
            )}

            {!loading &&
              filteredAndSorted.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="hover:bg-paper/40 cursor-pointer transition-colors duration-150"
                >
                  {/* Name (with city under it in muted text) */}
                  <td className="py-3 px-4">
                    <p className="font-medium text-ink hover:underline">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      {c.city || 'Panjim'}
                    </p>
                  </td>

                  {/* Segment stamp */}
                  <td className="py-3 px-4">
                    <SegmentStamp segment={c.segment} />
                  </td>

                  {/* Orders */}
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-ink">
                    {c.orderCount}
                  </td>

                  {/* Spent */}
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-ink">
                    {formatINR(c.totalSpend)}
                  </td>

                  {/* Last order (relative) */}
                  <td className="py-3 px-4 text-muted-ink font-sans">
                    {formatRelativeTime(c.lastOrderDate)}
                  </td>

                  {/* Health: a 60px thin bar plus the number */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-[60px] h-1.5 bg-hairline rounded-[2px] overflow-hidden flex-shrink-0">
                        <div
                          style={{ width: `${Math.min(100, Math.max(5, c.healthScore))}%` }}
                          className={`h-full ${getHealthBarColor(c.healthScore)}`}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-ink w-6 text-right">
                        {c.healthScore}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
