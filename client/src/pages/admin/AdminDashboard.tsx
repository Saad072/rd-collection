import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { Order } from '../../types';
import {
  StatusBadge,
  formatDate,
} from '../_local/ui';
import ErrorState from '../../components/feedback/ErrorState';

interface DashboardData {
  ordersToday: number;
  revenuePaise: number;
  pendingOrders: number;
  lowStockCount: number;
  productCount: number;
  recentOrders: Order[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.dashboard();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Loading...</p>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorState message={error || 'Failed to load dashboard'} onRetry={() => void load()} />
      </div>
    );
  }

  const cards = [
    { label: 'Orders today', value: String(data.ordersToday), icon: ShoppingBag },
    { label: 'Revenue today', value: formatINR(data.revenuePaise), icon: IndianRupee },
    { label: 'Pending orders', value: String(data.pendingOrders), icon: Clock },
    { label: 'Low-stock variants', value: String(data.lowStockCount), icon: AlertTriangle },
    { label: 'Products', value: String(data.productCount), icon: Package },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl">Dashboard</h1>

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="border border-line p-4">
            <c.icon className="mb-2 h-5 w-5 text-muted" aria-hidden />
            <p className="text-xl font-semibold">{c.value}</p>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold uppercase tracking-widest">Recent orders</h2>
        <Link to="/admin/orders" className="link-arrow text-sm">
          View all
        </Link>
      </div>

      {data.recentOrders.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No orders yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="py-2 pr-4 font-medium">Order</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Items</th>
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o._id} className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">{o.orderNumber}</td>
                  <td className="py-3 pr-4 text-muted">{formatDate(o.createdAt)}</td>
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
      )}

    </div>
  );
}
