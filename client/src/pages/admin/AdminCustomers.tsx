import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { Order, Paginated, User } from '../../types';
import { Modal, Pagination, StatusBadge, formatDate } from '../_local/ui';
import ErrorState from '../../components/feedback/ErrorState';

export default function AdminCustomers() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ user: User; orders: Order[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.customers.list({ q: debouncedQ || undefined, page });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await api.admin.customers.get(id);
      setDetail(res);
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : 'Failed to load customer');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <div>
      <h1 className="mb-6 text-xl">Customers</h1>

      <div className="mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          aria-label="Search customers"
          className="input max-w-xs"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error || !data ? (
        <ErrorState message={error || 'Failed to load customers'} onRetry={() => void load()} />
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No customers found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => void openDetail(u._id)}
                    className="cursor-pointer border-b border-line hover:bg-paper"
                  >
                    <td className="py-3 pr-4 font-medium">{u.name}</td>
                    <td className="py-3 pr-4 text-muted">{u.email}</td>
                    <td className="py-3 pr-4 text-muted">{u.phone || '—'}</td>
                    <td className="py-3">
                      <span className="inline-block bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-ink">
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <Modal
        open={selectedId !== null}
        onClose={closeDetail}
        title="Customer details"
        wide
      >
        {detailLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading...</p>
        ) : detailError || !detail ? (
          <ErrorState
            message={detailError || 'Customer not found'}
            onRetry={() => selectedId && void openDetail(selectedId)}
          />
        ) : (
          <div className="space-y-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Name</dt>
                <dd className="mt-0.5 font-medium">{detail.user.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Email</dt>
                <dd className="mt-0.5">{detail.user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Phone</dt>
                <dd className="mt-0.5">{detail.user.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Role</dt>
                <dd className="mt-0.5">{detail.user.role}</dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
                Orders ({detail.orders.length})
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-muted">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                        <th className="py-2 pr-4 font-medium">Order</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Total</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((o) => (
                        <tr key={o._id} className="border-b border-line">
                          <td className="py-2.5 pr-4 font-medium">{o.orderNumber}</td>
                          <td className="py-2.5 pr-4 text-muted">{formatDate(o.createdAt)}</td>
                          <td className="py-2.5 pr-4">{formatINR(o.totalPaise)}</td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="py-2.5 text-right">
                            <Link to={`/admin/orders/${o._id}`} className="link-arrow">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
