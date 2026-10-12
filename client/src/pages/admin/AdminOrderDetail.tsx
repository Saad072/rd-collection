import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { Order, OrderStatus } from '../../types';
import {
  ORDER_TRANSITIONS,
  StatusBadge,
  formatDateTime,
  orderStatusLabel,
  toast,
} from '../_local/ui';
import ErrorState from '../../components/feedback/ErrorState';
import { Field } from '../../components/forms/Field';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.orders.get(id);
      setOrder(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (next: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await api.admin.orders.updateStatus(order._id, next);
      setOrder(updated);
      toast(`Order marked as ${orderStatusLabel(next)}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const saveTracking = async () => {
    if (!order) return;
    if (!tracking.trim()) {
      toast('Enter a tracking ID first');
      return;
    }
    setUpdating(true);
    try {
      const updated = await api.admin.orders.updateStatus(order._id, order.status, tracking.trim());
      setOrder(updated);
      toast('Tracking saved');
      setTracking('');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Loading...</p>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorState message={error || 'Order not found'} onRetry={() => void load()} />
      </div>
    );
  }

  const transitions = ORDER_TRANSITIONS[order.status] ?? [];
  const a = order.address;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="mb-8 text-sm text-muted">
        Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'} ·{' '}
        {order.paymentStatus === 'cod_pending' ? 'COD pending' : order.paymentStatus}
      </p>

      <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-widest">Items</h2>
      <div className="mb-8 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="py-2 pr-4 font-medium">Item</th>
              <th className="py-2 pr-4 font-medium">Size</th>
              <th className="py-2 pr-4 font-medium">Colour</th>
              <th className="py-2 pr-4 font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.variantId}-${item.slug}`} className="border-b border-line">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt=""
                      className="h-11 w-11 shrink-0 border border-line object-cover"
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted">{item.size}</td>
                <td className="py-3 pr-4 text-muted">{item.color}</td>
                <td className="py-3 pr-4 text-muted">{item.qty}</td>
                <td className="py-3 text-right">{formatINR(item.unitPaise * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="border border-line p-5">
          <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-widest">
            Delivery address
          </h2>
          <address className="text-sm not-italic leading-relaxed text-muted">
            <span className="font-medium text-ink">{a.fullName}</span>
            <br />
            {a.addressLine}
            {a.locality ? `, ${a.locality}` : ''}
            <br />
            {a.city}, {a.state} — {a.pincode}
            <br />
            Phone: {a.phone}
            {a.email ? (
              <>
                <br />
                Email: {a.email}
              </>
            ) : null}
            {a.landmark ? (
              <>
                <br />
                Landmark: {a.landmark}
              </>
            ) : null}
          </address>
        </div>

        <div className="border border-line p-5">
          <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-widest">Totals</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatINR(order.subtotalPaise)}</dd>
            </div>
            {order.discountPaise > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                </dt>
                <dd className="text-sale">−{formatINR(order.discountPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{order.shippingPaise === 0 ? 'Free' : formatINR(order.shippingPaise)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border border-line p-5">
        <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-widest">Fulfillment</h2>
        {transitions.length === 0 ? (
          <p className="text-sm text-muted">
            This order is in a terminal state — no further actions available.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((next) => (
              <button
                key={next}
                type="button"
                disabled={updating}
                onClick={() => void changeStatus(next)}
                className="btn btn-outline !px-4 !py-2 text-xs uppercase tracking-widest"
              >
                Mark as {orderStatusLabel(next)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          <Field label="Tracking ID" htmlFor="tracking" hint="Saved against the current order status.">
            <div className="flex gap-2">
              <input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="e.g. DELHIVERY123456"
                className="input"
              />
              <button
                type="button"
                disabled={updating}
                onClick={() => void saveTracking()}
                className="btn shrink-0"
              >
                Save tracking
              </button>
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
