import React from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { CountUp } from '../components/CountUp.js';
import { Skeleton } from '../components/Skeleton.js';
import { formatINR, formatNumber } from '../lib/format.js';

export function Today() {
  const { data, loading, error, refetch } = useApi(() => api.dashboard.get());

  React.useEffect(() => {
    document.title = 'Today | Pulse';
    const timer = setInterval(() => {
      refetch();
    }, 8000);
    const orderHandler = () => {
      refetch();
    };
    window.addEventListener('pulse:order-created', orderHandler);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pulse:order-created', orderHandler);
    };
  }, [refetch]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-8 border-b border-hairline">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="h-72 lg:col-span-7" />
          <Skeleton className="h-72 lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center text-sm text-muted-ink">
        Failed to load ledger metrics. Check store connection.
      </div>
    );
  }

  // Calculate 30-day figures roughly from current month in revenueSeries or raw metrics
  const lastMonthSeries = data.revenueSeries[data.revenueSeries.length - 1];
  const revenue30d = lastMonthSeries?.revenue || Math.round(data.revenue * 0.22);
  const orders30d = lastMonthSeries?.orders || Math.round(data.orders * 0.2);
  const atRiskCount = data.segmentCounts['At Risk'] || data.atRiskList.length || 0;

  // Segment totals for the horizontal stacked bar
  const totalInSegments =
    (data.segmentCounts.VIP || 0) +
    (data.segmentCounts.Loyal || 0) +
    (data.segmentCounts.Regular || 0) +
    (data.segmentCounts.New || 0) +
    (data.segmentCounts['At Risk'] || 0) || 1;

  const vipPct = ((data.segmentCounts.VIP || 0) / totalInSegments) * 100;
  const loyalPct = ((data.segmentCounts.Loyal || 0) / totalInSegments) * 100;
  const regPct = ((data.segmentCounts.Regular || 0) / totalInSegments) * 100;
  const newPct = ((data.segmentCounts.New || 0) / totalInSegments) * 100;
  const atRiskPct = ((data.segmentCounts['At Risk'] || 0) / totalInSegments) * 100;

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-ink font-mono mb-1">
          Store ledger
        </p>
        <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight">
          Today
        </h1>
      </div>

      {/* Top row: four figures set as large serif numbers with tiny labels, NOT boxed cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-hairline border-y border-hairline py-6">
        {/* Revenue (30d) */}
        <div className="px-4 py-2 first:pl-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-ink">
            Revenue (30d)
          </p>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-ink tracking-tight mt-1">
            <CountUp value={revenue30d} isCurrency />
          </div>
        </div>

        {/* Active customers */}
        <div className="px-4 py-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-ink">
            Active customers
          </p>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-ink tracking-tight mt-1">
            <CountUp value={data.customers} />
          </div>
        </div>

        {/* Orders (30d) */}
        <div className="px-4 py-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-ink">
            Orders (30d)
          </p>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-ink tracking-tight mt-1">
            <CountUp value={orders30d} />
          </div>
        </div>

        {/* At risk */}
        <div className="px-4 py-2 last:pr-0">
          <p className="text-[11px] uppercase tracking-wider text-mustard">
            At risk
          </p>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-mustard tracking-tight mt-1">
            <CountUp value={atRiskCount} />
          </div>
        </div>
      </div>

      {/* Middle row: Chart + "Needs a nudge today" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recharts area chart of monthly revenue */}
        <div className="lg:col-span-7 bg-surface border border-hairline rounded-[6px] p-6">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Monthly revenue
              </h2>
              <p className="text-xs text-muted-ink mt-0.5">
                Past six months in INR
              </p>
            </div>
            <span className="text-xs font-mono text-muted-ink tabular-nums">
              AOV: {formatINR(data.avgOrderValue)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.revenueSeries}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="terracottaFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4552D" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#C4552D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#E3DACA"
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#6B6259"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E3DACA' }}
                  dy={6}
                />
                <YAxis
                  stroke="#6B6259"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `₹${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-surface border border-hairline px-3 py-2 rounded-[4px]">
                          <p className="text-[11px] text-muted-ink font-mono">
                            {item.label}
                          </p>
                          <p className="font-serif font-semibold text-ink text-sm tabular-nums mt-0.5">
                            {formatINR(item.revenue)}
                          </p>
                          <p className="text-[10px] text-muted-ink mt-0.5">
                            {item.orders} orders
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C4552D"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#terracottaFade)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Next to it: "Needs a nudge today" list */}
        <div className="lg:col-span-5 bg-surface border border-hairline rounded-[6px] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Needs a nudge today
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              High spenders sliding into silence
            </p>
          </div>

          <div className="divide-y divide-hairline">
            {data.atRiskList.slice(0, 5).map(cust => (
              <div
                key={cust.id}
                className="py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <Link
                    to={`/customers/${cust.id}`}
                    className="font-medium text-ink hover:underline block"
                  >
                    {cust.name}
                  </Link>
                  <p className="text-xs text-muted-ink mt-0.5 font-sans">
                    <span className="text-mustard font-medium tabular-nums">
                      {cust.daysIdle} days idle
                    </span>
                    {' · '}
                    <span className="tabular-nums font-mono text-[11px]">
                      {formatINR(cust.totalSpend)}
                    </span>
                  </p>
                </div>

                <Link
                  to={`/customers/${cust.id}`}
                  className="text-xs font-medium text-terracotta hover:underline ml-4 flex-shrink-0"
                >
                  Open
                </Link>
              </div>
            ))}

            {data.atRiskList.length === 0 && (
              <p className="py-6 text-xs text-muted-ink text-center">
                No patrons need attention today. Check back after next sync.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Segment breakdown + Best sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Segment breakdown as one horizontal stacked bar with labeled counts */}
        <div className="lg:col-span-7 bg-surface border border-hairline rounded-[6px] p-6 space-y-5">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">
              Customer distribution
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              {data.customers} registered patrons categorized by loyalty and recency
            </p>
          </div>

          {/* Horizontal stacked bar */}
          <div className="h-3.5 w-full flex rounded-[3px] overflow-hidden border border-hairline">
            <div
              style={{ width: `${vipPct}%` }}
              className="bg-terracotta h-full transition-all duration-300"
              title={`VIP: ${data.segmentCounts.VIP}`}
            />
            <div
              style={{ width: `${loyalPct}%` }}
              className="bg-deepgreen h-full transition-all duration-300"
              title={`Loyal: ${data.segmentCounts.Loyal}`}
            />
            <div
              style={{ width: `${regPct}%` }}
              className="bg-muted-ink h-full transition-all duration-300"
              title={`Regular: ${data.segmentCounts.Regular}`}
            />
            <div
              style={{ width: `${newPct}%` }}
              className="bg-ink h-full transition-all duration-300"
              title={`New: ${data.segmentCounts.New}`}
            />
            <div
              style={{ width: `${atRiskPct}%` }}
              className="bg-mustard h-full transition-all duration-300"
              title={`At Risk: ${data.segmentCounts['At Risk']}`}
            />
          </div>

          {/* Labeled counts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-terracotta flex-shrink-0" />
              <span className="text-muted-ink">VIP</span>
              <span className="font-mono font-medium text-ink tabular-nums ml-auto">
                {data.segmentCounts.VIP}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-deepgreen flex-shrink-0" />
              <span className="text-muted-ink">Loyal</span>
              <span className="font-mono font-medium text-ink tabular-nums ml-auto">
                {data.segmentCounts.Loyal}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-muted-ink flex-shrink-0" />
              <span className="text-muted-ink">Regular</span>
              <span className="font-mono font-medium text-ink tabular-nums ml-auto">
                {data.segmentCounts.Regular}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-ink flex-shrink-0" />
              <span className="text-muted-ink">New</span>
              <span className="font-mono font-medium text-ink tabular-nums ml-auto">
                {data.segmentCounts.New}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-mustard flex-shrink-0" />
              <span className="text-muted-ink">At Risk</span>
              <span className="font-mono font-medium text-mustard tabular-nums ml-auto">
                {data.segmentCounts['At Risk']}
              </span>
            </div>
          </div>
        </div>

        {/* "Best sellers" simple ranked list */}
        <div className="lg:col-span-5 bg-surface border border-hairline rounded-[6px] p-6">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Best sellers
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              Ranked by total sales in store
            </p>
          </div>

          <div className="divide-y divide-hairline">
            {data.topProducts.map((prod, idx) => (
              <div
                key={prod.productName}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <span className="font-mono text-muted-ink text-[11px] w-4 flex-shrink-0">
                    0{idx + 1}
                  </span>
                  <span className="font-medium text-ink truncate">
                    {prod.productName}
                  </span>
                </div>

                <div className="text-right flex-shrink-0 font-sans">
                  <span className="font-serif font-semibold text-ink tabular-nums">
                    {formatINR(prod.revenue)}
                  </span>
                  <span className="text-muted-ink text-[10px] block tabular-nums">
                    {prod.quantity} units
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
