import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, RefreshCcw, Trash2, Truck } from 'lucide-react';
import QtyStepper from '../components/feedback/QtyStepper';
import EmptyState from '../components/feedback/EmptyState';
import { Breadcrumbs, toast } from './_local/ui';
import { api, ApiError } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { computeTotals, formatINR } from '../lib/pricing';

export default function CartPage() {
  const { items, setQty, removeItem, subtotalPaise } = useCartStore();
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(true);

  // On mount: pull the server cart (items + applied coupon) for logged-in users.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCouponLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api.cart.get();
        if (!alive) return;
        useCartStore.setState({ items: res.items });
        setCouponCode(res.couponCode ?? null);
      } catch {
        // Server cart unavailable — keep the local cart as-is.
      } finally {
        if (alive) setCouponLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, loading]);

  const sub = subtotalPaise();
  const totals = computeTotals(sub);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await api.cart.applyCoupon(code);
      useCartStore.setState({ items: res.items });
      setCouponCode(res.couponCode);
      setCouponInput('');
      toast('Coupon applied');
    } catch (e) {
      setCouponError(e instanceof ApiError ? e.message : 'Could not apply this coupon.');
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    if (couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await api.cart.removeCoupon();
      useCartStore.setState({ items: res.items });
      setCouponCode(null);
      toast('Coupon removed');
    } catch (e) {
      setCouponError(e instanceof ApiError ? e.message : 'Could not remove the coupon.');
    } finally {
      setCouponBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} />
      <h1 className="mb-8 text-2xl">Shopping Bag</h1>

      {items.length === 0 ? (
        <EmptyState
          title="Your bag is empty"
          message="Looks like you have not added anything yet. Browse our latest ethnic wear and find something you love."
          action={{ label: 'Start shopping', to: '/' }}
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <div>
            <ul className="divide-y divide-line border-y border-line">
              {items.map((item) => (
                <li
                  key={`${item.productId}__${item.variantId}`}
                  className="flex gap-4 py-5 sm:gap-6"
                >
                  <Link to={`/products/${item.slug}`} className="shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-28 w-[88px] object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to={`/products/${item.slug}`}
                          className="text-[15px] font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-[13px] text-muted">
                          Size: {item.size} · Colour: {item.color}
                        </p>
                        <p className="mt-1 text-[13px] text-muted">
                          {formatINR(item.unitPaise)} each
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold">
                        {formatINR(item.unitPaise * item.qty)}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <QtyStepper
                        qty={item.qty}
                        max={10}
                        label={`Quantity for ${item.name}`}
                        onChange={(qty) => setQty(item.productId, item.variantId, qty)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label={`Remove ${item.name} from bag`}
                        className="flex items-center gap-1.5 text-[13px] text-muted hover:text-sale"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/" className="link-arrow mt-6 inline-block">
              Continue shopping
            </Link>
          </div>

          {/* Summary */}
          <aside className="h-fit border border-line p-6 lg:sticky lg:top-24">
            <h2 className="mb-5 text-lg">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-6">
              {!loading && !user ? (
                <p className="border border-dashed border-line bg-paper p-3 text-[13px] text-muted">
                  <Link to="/login" state={{ from: '/cart' }} className="underline">
                    Log in
                  </Link>{' '}
                  to apply a coupon code.
                </p>
              ) : couponLoading ? (
                <div className="h-10 animate-pulse bg-paper" aria-hidden />
              ) : couponCode ? (
                <div className="flex items-center justify-between gap-3 border border-line bg-paper p-3">
                  <span className="text-[13px] font-semibold uppercase tracking-widest">
                    {couponCode}
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    disabled={couponBusy}
                    className="text-[13px] text-muted underline hover:text-sale disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <label htmlFor="coupon-code" className="sr-only">
                      Coupon code
                    </label>
                    <input
                      id="coupon-code"
                      className="input flex-1 uppercase"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      disabled={couponBusy}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                      className="btn btn-outline shrink-0 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p role="alert" className="mt-2 text-xs text-sale">
                      {couponError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Totals */}
            <dl className="space-y-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatINR(totals.subtotalPaise)}</dd>
              </div>
              {totals.discountPaise > 0 && (
                <div className="flex justify-between text-sale">
                  <dt>Offer discount</dt>
                  <dd>− {formatINR(totals.discountPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>
                  {totals.shippingPaise === 0 ? (
                    <span className="font-semibold text-green-800">FREE</span>
                  ) : (
                    formatINR(totals.shippingPaise)
                  )}
                </dd>
              </div>
              {couponCode && (
                <p className="text-[12px] text-muted">
                  Coupon {couponCode} applied — final coupon saving is calculated at checkout.
                </p>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-[16px] font-semibold">
                <dt>Total</dt>
                <dd>{formatINR(totals.totalPaise)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] text-muted">
              Totals are estimated — the server calculates the final amount.
            </p>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="btn mt-6 w-full"
            >
              Proceed to Checkout
            </button>

            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-[13px] text-muted">
              <li className="flex items-center gap-2.5">
                <Banknote className="h-4 w-4 shrink-0" aria-hidden /> Cash on Delivery available
              </li>
              <li className="flex items-center gap-2.5">
                <RefreshCcw className="h-4 w-4 shrink-0" aria-hidden /> 7-day easy exchange
              </li>
              <li className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 shrink-0" aria-hidden /> Dispatched in 24–48 hours
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
