import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { OrderStatus, Paginated, Order } from '../../types';
import {
  Pagination,
  StatusBadge,
  formatDate,
  orderStatusLabel,
} from '../_local/ui';
import ErrorState from '../../components/feedback/ErrorState';

const STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
  'refund_pending',
  'refunded',
];

export default function AdminOrders() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.orders.list({
        q: debouncedQ || undefined,
        status: status || undefined,
        page,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickStatus = (s: OrderStatus | '') => {
    setStatus(s);
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-6 text-xl">Orders</h1>

      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by order number..."
          aria-label="Search orders"
          className="input max-w-xs"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <button
          type="button"
          onClick={() => pickStatus('')}
          aria-pressed={status === ''}
          className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
            status === '' ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pickStatus(s)}
            aria-pressed={status === s}
            className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
              status === s ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
            }`}
          >
            {orderStatusLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error || !data ? (
        <ErrorState message={error || 'Failed to load orders'} onRetry={() => void load()} />
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No orders match this filter.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-4 font-medium">Order</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Items</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o._id} className="border-b border-line">
                    <td className="py-3 pr-4 font-medium">{o.orderNumber}</td>
                    <td className="py-3 pr-4 text-muted">{formatDate(o.createdAt)}</td>
                    <td className="py-3 pr-4">{o.address.fullName}</td>
                    <td className="py-3 pr-4 text-muted">
                      {o.items.reduce((n, i) => n + i.qty, 0)}
                    </td>
                    <td className="py-3 pr-4">{formatINR(o.totalPaise)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link to={`/admin/orders/${o._id}`} className="link-arrow">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
