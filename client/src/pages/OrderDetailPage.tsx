import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ErrorState from '../components/feedback/ErrorState';
import {
  Breadcrumbs,
  StatusBadge,
  formatDateTime,
  formatINR,
  isCancellable,
  orderStatusLabel,
  toast,
} from './_local/ui';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Address, Order, OrderStatus } from '../types';

const MILESTONES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

function AddressBlock({ address }: { address: Address }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{address.fullName}</p>
      <p>{address.addressLine}</p>
      {address.locality && <p>{address.locality}</p>}
      {address.landmark && <p>Landmark: {address.landmark}</p>}
      <p>
        {address.city}, {address.state} {address.pincode}
      </p>
      <p className="text-muted">Phone: {address.phone}</p>
    </div>
  );
}

const PAYMENT_LABEL: Record<Order['paymentStatus'], string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  cod_pending: 'Cash on Delivery',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let alive = true;
    setFetching(true);
    api
      .orders.get(id)
      .then((o) => {
        if (alive) {
          setOrder(o);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof ApiError ? e.message : 'Could not load this order.');
        }
      })
      .finally(() => {
        if (alive) setFetching(false);
      });
    return () => {
      alive = false;
    };
  }, [user, id]);

  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: `/account/orders/${id ?? ''}` }} replace />;
  }

  const cancelOrder = async () => {
    if (!order || cancelling) return;
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.orders.cancel(order._id);
      setOrder(updated);
      toast('Order cancelled');
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  };

  const reachedIdx = order ? MILESTONES.indexOf(order.status) : -1;
  const isBranchEnd = order !== null && reachedIdx === -1;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'My Orders', to: '/account/orders' },
          { label: order ? `#${order.orderNumber}` : 'Order' },
        ]}
      />

      {fetching ? (
        <div className="py-8" aria-label="Loading order">
          <div className="h-8 w-1/2 animate-pulse bg-paper" />
          <div className="mt-4 h-56 animate-pulse bg-paper" />
        </div>
      ) : error || !order ? (
        <ErrorState message={error ?? 'We could not find this order.'} />
      ) : (
        <div>
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl">Order #{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mb-8 text-sm text-muted">
            Placed {formatDateTime(order.createdAt)} · {PAYMENT_LABEL[order.paymentStatus]}
          </p>

          {/* Status timeline */}
          <section aria-label="Order status" className="mb-10 border border-line p-6">
            <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-muted">
              Delivery status
            </h2>
            <ol className="space-y-0">
              {MILESTONES.map((m, i) => {
                const reached = !isBranchEnd && i <= reachedIdx;
                return (
                  <li key={m} className="flex gap-4">
                    <div className="flex flex-col items-center" aria-hidden>
                      <span
                        className={`mt-1 h-3 w-3 rounded-full ${
                          reached ? 'bg-ink' : 'border border-line bg-white'
                        }`}
                      />
                      {i < MILESTONES.length - 1 && (
                        <span className={`w-px flex-1 ${reached ? 'bg-ink' : 'bg-line'}`} />
                      )}
                    </div>
                    <p
                      className={`pb-5 text-sm ${
                        reached ? 'font-semibold text-ink' : 'text-muted'
                      }`}
                    >
                      {orderStatusLabel(m)}
                    </p>
                  </li>
                );
              })}
            </ol>
            {isBranchEnd && (
              <p className="mt-1 text-sm text-muted">
                This order was {orderStatusLabel(order.status).toLowerCase()}.
              </p>
            )}
            {isCancellable(order.status) && (
              <div className="mt-4 border-t border-line pt-4">
                {cancelError && (
                  <p role="alert" className="mb-3 text-sm text-sale">
                    {cancelError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="btn btn-outline disabled:opacity-60"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel order'}
                </button>
              </div>
            )}
          </section>

          {/* Items */}
          <section aria-label="Order items" className="mb-8">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted">
              Items ({order.items.length})
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {order.items.map((item) => (
                <li key={`${item.productId}__${item.variantId}`} className="flex items-center gap-4 py-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-14 object-cover"
                    loading="lazy"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-[13px] text-muted">
                      Size: {item.size} · Colour: {item.color} · Qty {item.qty}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatINR(item.unitPaise * item.qty)}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-label="Delivery address" className="border border-line p-5">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted">
                Delivery address
              </h2>
              <AddressBlock address={order.address} />
            </section>
            <section aria-label="Order totals" className="border border-line p-5">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted">
                Order totals
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd>{formatINR(order.subtotalPaise)}</dd>
                </div>
                {order.discountPaise > 0 && (
                  <div className="flex justify-between text-sale">
                    <dt>Discount</dt>
                    <dd>− {formatINR(order.discountPaise)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd>{order.shippingPaise === 0 ? 'FREE' : formatINR(order.shippingPaise)}</dd>
                </div>
                {order.couponCode && (
                  <div className="flex justify-between text-[13px] text-muted">
                    <dt>Coupon</dt>
                    <dd className="uppercase">{order.couponCode}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
                  <dt>Total</dt>
                  <dd>{formatINR(order.totalPaise)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-10">
            <Link to="/account/orders" className="link-arrow text-sm">
              Back to my orders
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
