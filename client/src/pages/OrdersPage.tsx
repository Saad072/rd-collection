import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import { Breadcrumbs, Pagination, StatusBadge, formatDate, formatINR } from './_local/ui';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Order } from '../types';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const { user, loading } = useAuthStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .orders.list()
      .then((list) => {
        if (alive) {
          setOrders(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof ApiError ? e.message : 'Could not load your orders.');
        }
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: '/account/orders' }} replace />;
  }

  const totalPages = Math.max(1, Math.ceil((orders?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = orders
    ? orders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: 'My Account', to: '/account' }, { label: 'My Orders' }]}
      />
      <h1 className="mb-8 text-2xl">My Orders</h1>

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : orders === null ? (
        <div className="space-y-3" aria-label="Loading orders">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse bg-paper" aria-hidden />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="When you place an order it will show up here with its delivery status."
          action={{ label: 'Start shopping', to: '/' }}
        />
      ) : (
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {pageItems.map((o) => (
              <li key={o._id}>
                <Link
                  to={`/account/orders/${o._id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 py-4 text-sm hover:bg-paper"
                  aria-label={`Order ${o.orderNumber}`}
                >
                  <span className="font-semibold">#{o.orderNumber}</span>
                  <span className="text-muted">{formatDate(o.createdAt)}</span>
                  <StatusBadge status={o.status} />
                  <span className="text-muted">
                    {o.items.length} item{o.items.length === 1 ? '' : 's'}
                  </span>
                  <span className="ml-auto font-semibold">{formatINR(o.totalPaise)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
