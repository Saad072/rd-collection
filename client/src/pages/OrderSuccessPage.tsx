import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import ErrorState from '../components/feedback/ErrorState';
import { Breadcrumbs, StatusBadge, formatDateTime, formatINR } from './_local/ui';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Address, Order } from '../types';

const PAYMENT_LABEL: Record<Order['paymentStatus'], string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  cod_pending: 'Cash on Delivery',
};

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

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user, loading: authLoading } = useAuthStore();

  const stateOrder = (location.state as { order?: Order } | null)?.order ?? null;
  const [order, setOrder] = useState<Order | null>(stateOrder);
  const [loading, setLoading] = useState(!stateOrder);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stateOrder) return;
    if (!id) {
      setError('We could not find this order.');
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
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
          setError(e instanceof ApiError ? e.message : 'We could not load this order.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, stateOrder]);

  if (!authLoading && !user) {
    return <Navigate to="/login" state={{ from: `/order-success/${id ?? ''}` }} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Order placed' }]} />

      {loading ? (
        <div className="py-10">
          <div className="h-10 w-2/3 animate-pulse bg-paper" />
          <div className="mt-4 h-48 animate-pulse bg-paper" />
        </div>
      ) : error || !order ? (
        <ErrorState
          message={error ?? 'We could not find this order.'}
          onRetry={() => {
            setError(null);
            setOrder(stateOrder);
            setLoading(!!id && !stateOrder);
          }}
        />
      ) : (
        <div>
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-700" aria-hidden />
            <h1 className="mt-4 text-2xl">Order placed!</h1>
            <p className="mt-2 text-[15px] text-muted">
              Thank you — your order <span className="font-semibold text-ink">#{order.orderNumber}</span> is
              confirmed.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <StatusBadge status={order.status} />
              <span className="text-sm text-muted">
                {PAYMENT_LABEL[order.paymentStatus]} · Placed {formatDateTime(order.createdAt)}
              </span>
            </div>
          </div>

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
                  <dd>
                    {order.shippingPaise === 0 ? 'FREE' : formatINR(order.shippingPaise)}
                  </dd>
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

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-outline">
              Continue shopping
            </Link>
            <Link to="/account/orders" className="btn">
              View my orders
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
