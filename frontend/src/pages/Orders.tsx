import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { SkeletonRow } from '../components/Skeleton.js';
import { formatINR, formatDate, formatRelativeTime } from '../lib/format.js';

export function Orders() {
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    document.title = 'Orders | Pulse';
  }, []);

  const { data: orders, loading, error } = useApi(
    () => api.orders.list({ status: selectedStatus }),
    [selectedStatus]
  );

  const statuses = ['all', 'completed', 'processing', 'pending', 'refunded'];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-hairline pb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight">
            Orders
          </h1>
          <p className="text-xs text-muted-ink mt-0.5">
            Store transactions ledger synced from WooCommerce
          </p>
        </div>
        <div className="text-xs font-mono text-muted-ink tabular-nums">
          {orders ? `${orders.length} orders` : ''}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-5 overflow-x-auto pb-1 text-xs">
        {statuses.map(st => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`capitalize pb-1 whitespace-nowrap transition-colors duration-150 ${
              selectedStatus === st
                ? 'text-ink font-semibold border-b-2 border-ink'
                : 'text-muted-ink hover:text-ink'
            }`}
          >
            {st === 'all' ? 'All orders' : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-hairline rounded-[6px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-paper/40 text-[11px] uppercase tracking-wider text-muted-ink font-medium">
              <th className="py-2.5 px-4 font-medium">Order</th>
              <th className="py-2.5 px-4 font-medium">Customer</th>
              <th className="py-2.5 px-4 font-medium">Date</th>
              <th className="py-2.5 px-4 font-medium">Items</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium text-right">Total</th>
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

            {!loading && (!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-muted-ink">
                  No orders match this status. Sync store to pull fresh purchases.
                </td>
              </tr>
            )}

            {!loading &&
              orders &&
              orders.map(o => (
                <tr
                  key={o.id}
                  className="hover:bg-paper/40 transition-colors duration-150"
                >
                  <td className="py-3 px-4 font-mono font-medium text-ink">
                    #{o.wooOrderId}
                  </td>
                  <td className="py-3 px-4">
                    {o.customer ? (
                      <Link
                        to={`/customers/${o.customer.id}`}
                        className="font-medium text-ink hover:underline block"
                      >
                        {o.customer.name}
                      </Link>
                    ) : (
                      <span className="text-ink">Store Patron</span>
                    )}
                    <span className="text-[11px] text-muted-ink">
                      {o.customer?.city || 'Panjim'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-ink">
                    <span>{formatDate(o.orderDate)}</span>
                    <span className="block text-[10px]">
                      {formatRelativeTime(o.orderDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-ink">
                    <span className="text-ink font-medium">
                      {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                    </span>
                    <span className="block text-[11px] truncate max-w-xs">
                      {o.items.map(it => it.productName).join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-paper border border-hairline text-ink">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-serif font-semibold text-ink text-sm tabular-nums">
                    {formatINR(o.totalAmount)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
