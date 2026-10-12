import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Banknote, Check, ChevronLeft, ChevronRight, CreditCard, Truck } from 'lucide-react';
import { Field } from '../components/forms/Field';
import { AddressForm, addressSchema } from '../components/forms/AddressForm';
import { Breadcrumbs, toast } from './_local/ui';
import { zodResolver } from './_local/rhf';
import { api, ApiError } from '../services/api';
import { newIdempotencyKey, openRazorpayPayment } from '../services/payments';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { computeTotals, formatINR } from '../lib/pricing';
import type { Address } from '../types';

const STEPS = ['Contact', 'Address', 'Shipping', 'Payment', 'Review'] as const;

const DEVICE_KEY = 'rdc-addresses';

const contactSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

const checkoutSchema = z.object({
  contact: contactSchema,
  shipping: addressSchema,
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const EMPTY_SHIPPING = {
  fullName: '',
  phone: '',
  email: '',
  addressLine: '',
  locality: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
};

interface SavedEntry {
  label: string;
  address: Address;
}

interface PincodeInfo {
  serviceable: boolean;
  cod: boolean;
  etaDays: [number, number];
}

function readDeviceAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is Address => typeof a === 'object' && a !== null);
  } catch {
    return [];
  }
}

function formatAddress(a: Address): string {
  const parts = [
    a.fullName,
    a.addressLine,
    a.locality,
    `${a.city}, ${a.state} ${a.pincode}`,
    `Phone: ${a.phone}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

export default function CheckoutPage() {
  const { user, loading } = useAuthStore();
  const { items, syncWithServer, subtotalPaise, clear } = useCartStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [synced, setSynced] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<number | null>(null);
  const [saveToDevice, setSaveToDevice] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState<Address | null>(null);
  const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [codAvailable, setCodAvailable] = useState<boolean | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const syncRef = useRef(false);
  const prefillRef = useRef(false);

  const {
    register,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: {
      contact: { fullName: '', email: '', phone: '' },
      shipping: EMPTY_SHIPPING,
    },
  });

  // Merge any guest cart into the server cart once, right after login state resolves.
  useEffect(() => {
    if (loading || !user || syncRef.current) return;
    syncRef.current = true;
    (async () => {
      try {
        await syncWithServer();
      } finally {
        setSynced(true);
      }
    })();
  }, [loading, user, syncWithServer]);

  // Prefill contact details from the account once.
  useEffect(() => {
    if (user && !prefillRef.current) {
      prefillRef.current = true;
      setValue('contact.fullName', user.name, { shouldValidate: false });
      setValue('contact.email', user.email, { shouldValidate: false });
      if (user.phone) setValue('contact.phone', user.phone, { shouldValidate: false });
    }
  }, [user, setValue]);

  const savedAddresses: SavedEntry[] = useMemo(() => {
    const entries: SavedEntry[] = [];
    const seen = new Set<string>();
    const push = (label: string, address: Address) => {
      const sig = JSON.stringify(address);
      if (seen.has(sig)) return;
      seen.add(sig);
      entries.push({ label, address });
    };
    (user?.addresses ?? []).forEach((a) => push('Saved on your account', a));
    readDeviceAddresses().forEach((a) => push('Saved on this device', a));
    return entries;
  }, [user]);

  const sub = subtotalPaise();
  const totals = computeTotals(sub);

  // Shipping step: look up the actual delivery estimate for the confirmed pincode.
  useEffect(() => {
    if (step !== 2 || !confirmedAddress) return;
    const pincode = confirmedAddress.pincode;
    if (!/^\d{6}$/.test(pincode)) return;
    let alive = true;
    setPincodeInfo(null);
    setPincodeError(null);
    api
      .checkPincode(pincode)
      .then((info) => {
        if (!alive) return;
        setPincodeInfo(info);
        setCodAvailable(info.cod);
      })
      .catch(() => {
        if (!alive) return;
        setPincodeError('Could not check delivery for this pincode.');
      });
    return () => {
      alive = false;
    };
  }, [step, confirmedAddress]);

  /* ---------------- step navigation ---------------- */

  const continueFromContact = async () => {
    setFormError(null);
    const ok = await trigger(['contact.fullName', 'contact.email', 'contact.phone']);
    if (ok) setStep(1);
  };

  const continueFromAddress = async () => {
    setFormError(null);
    if (selectedSaved !== null) {
      const entry = savedAddresses[selectedSaved];
      if (!entry) {
        setFormError('Please choose a delivery address.');
        return;
      }
      setConfirmedAddress(entry.address);
      setStep(2);
      return;
    }
    const ok = await trigger('shipping');
    if (!ok) return;
    const addr = getValues('shipping') as Address;
    if (saveToDevice) {
      const existing = readDeviceAddresses();
      const sig = JSON.stringify(addr);
      if (!existing.some((a) => JSON.stringify(a) === sig)) {
        try {
          localStorage.setItem(DEVICE_KEY, JSON.stringify([...existing, addr]));
        } catch {
          // Storage full / unavailable — the order flow continues regardless.
        }
        toast('Address saved to this device');
      }
    }
    setConfirmedAddress(addr);
    setStep(2);
  };

  const placeOrder = async () => {
    if (processing || !confirmedAddress) return;
    const contact = getValues('contact');
    setProcessing(true);
    setPayError(null);
    const key = newIdempotencyKey();
    try {
      await syncWithServer();
      const order = await api.orders.create({
        address: confirmedAddress,
        paymentMethod,
        idempotencyKey: key,
      });
      if (paymentMethod === 'razorpay') {
        const rp = await api.payments.createOrder(order._id);
        await openRazorpayPayment({
          key: rp.keyId,
          order: { id: rp.razorpayOrderId, amount: rp.amountPaise, currency: 'INR' },
          prefill: { name: contact.fullName, email: contact.email, contact: contact.phone },
          onSuccess: async (resp) => {
            try {
              await api.payments.verify({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              clear();
              navigate(`/order-success/${order._id}`, { state: { orderId: order._id } });
            } catch (e) {
              setPayError(
                e instanceof ApiError
                  ? e.message
                  : 'Payment verification failed. Check My Orders before retrying.',
              );
            }
          },
          onDismiss: () => {
            setPayError(
              'Payment was not completed. Your order is saved — retry from My Orders.',
            );
            setProcessing(false);
          },
        });
      } else {
        clear();
        navigate(`/order-success/${order._id}`, { state: { orderId: order._id } });
      }
    } catch (e) {
      setPayError(
        e instanceof ApiError ? e.message : 'Order could not be placed. Please try again.',
      );
    } finally {
      setProcessing(false);
    }
  };

  /* ---------------- guards (after hooks) ---------------- */

  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  }
  if (!synced) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-8 w-1/2 animate-pulse bg-paper" />
        <div className="mt-4 h-40 animate-pulse bg-paper" />
      </div>
    );
  }
  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const contact = getValues('contact');

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="mb-8 text-2xl">Checkout</h1>

      {/* Stepper */}
      <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className="flex items-center gap-2 disabled:cursor-default"
                aria-current={current ? 'step' : undefined}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center text-[13px] font-semibold ${
                    current
                      ? 'bg-ink text-white'
                      : done
                        ? 'bg-ink/10 text-ink'
                        : 'border border-line text-muted'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span
                  className={`text-[13px] uppercase tracking-widest ${
                    current ? 'font-semibold text-ink' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {formError && (
        <p role="alert" className="mb-6 border border-sale/40 bg-sale/5 p-3 text-sm text-sale">
          {formError}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Step 0 — Contact */}
          {step === 0 && (
            <section aria-label="Contact details">
              <h2 className="mb-5 text-lg">Contact details</h2>
              <div className="space-y-4">
                <Field
                  label="Full name"
                  htmlFor="co-name"
                  required
                  error={errors.contact?.fullName?.message}
                >
                  <input id="co-name" className="input" autoComplete="name" {...register('contact.fullName')} />
                </Field>
                <Field
                  label="Email"
                  htmlFor="co-email"
                  required
                  error={errors.contact?.email?.message}
                >
                  <input
                    id="co-email"
                    type="email"
                    className="input"
                    autoComplete="email"
                    {...register('contact.email')}
                  />
                </Field>
                <Field
                  label="Phone"
                  htmlFor="co-phone"
                  required
                  hint="10-digit mobile number"
                  error={errors.contact?.phone?.message}
                >
                  <input
                    id="co-phone"
                    className="input"
                    inputMode="numeric"
                    autoComplete="tel"
                    {...register('contact.phone')}
                  />
                </Field>
              </div>
              <div className="mt-8 flex justify-end">
                <button type="button" onClick={continueFromContact} className="btn">
                  Continue to Address <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* Step 1 — Address */}
          {step === 1 && (
            <section aria-label="Delivery address">
              <h2 className="mb-5 text-lg">Delivery address</h2>
              {savedAddresses.length > 0 && (
                <div className="mb-6 space-y-3" role="radiogroup" aria-label="Saved addresses">
                  {savedAddresses.map((entry, i) => (
                    <label
                      key={`${entry.label}-${i}`}
                      className={`flex cursor-pointer gap-3 border p-4 text-sm ${
                        selectedSaved === i ? 'border-ink' : 'border-line'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address-source"
                        checked={selectedSaved === i}
                        onChange={() => setSelectedSaved(i)}
                        className="mt-1"
                      />
                      <span>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                          {entry.label}
                        </span>
                        {formatAddress(entry.address)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <label className="mb-4 flex cursor-pointer items-center gap-3 border border-line p-4 text-sm font-medium">
                <input
                  type="radio"
                  name="address-source"
                  checked={selectedSaved === null}
                  onChange={() => setSelectedSaved(null)}
                />
                Use a different address
              </label>

              {selectedSaved === null && (
                <div className="mb-4">
                  <AddressForm
                    register={register}
                    errors={(errors.shipping ?? {}) as never}
                    prefix="shipping"
                    idPrefix="ship"
                  />
                  <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] text-muted">
                    <input
                      type="checkbox"
                      checked={saveToDevice}
                      onChange={(e) => setSaveToDevice(e.target.checked)}
                    />
                    Save to this device
                  </label>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep(0)} className="btn btn-outline">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button type="button" onClick={continueFromAddress} className="btn">
                  Continue to Shipping <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* Step 2 — Shipping */}
          {step === 2 && confirmedAddress && (
            <section aria-label="Shipping method">
              <h2 className="mb-5 text-lg">Shipping method</h2>
              <label className="flex cursor-pointer items-start gap-3 border border-ink p-4">
                <input
                  type="radio"
                  name="shipping-method"
                  checked
                  onChange={() => undefined}
                  className="mt-1"
                />
                <span className="flex flex-1 items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-medium">Standard delivery</span>
                    <span className="mt-1 block text-[13px] text-muted">
                      {pincodeInfo
                        ? `Estimated (demo): ${pincodeInfo.etaDays[0]}-${pincodeInfo.etaDays[1]} days`
                        : '3-7 business days (estimated)'}
                    </span>
                    {pincodeInfo && !pincodeInfo.serviceable && (
                      <span className="mt-1 block text-[13px] text-sale">
                        Delivery to this pincode could not be confirmed — our team will contact
                        you after you place the order.
                      </span>
                    )}
                  </span>
                  <span className="ml-auto font-semibold">
                    {totals.shippingPaise === 0 ? 'FREE' : formatINR(totals.shippingPaise)}
                  </span>
                </span>
              </label>
              {pincodeError && (
                <p role="alert" className="mt-3 text-[13px] text-sale">
                  {pincodeError}
                </p>
              )}
              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn">
                  Continue to Payment <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* Step 3 — Payment */}
          {step === 3 && (
            <section aria-label="Payment method">
              <h2 className="mb-5 text-lg">Payment method</h2>
              <div className="space-y-3" role="radiogroup" aria-label="Payment options">
                <label
                  className={`flex cursor-pointer items-start gap-3 border p-4 ${
                    paymentMethod === 'cod' ? 'border-ink' : 'border-line'
                  } ${codAvailable === false ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    disabled={codAvailable === false}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      <Banknote className="h-5 w-5" aria-hidden /> Cash on Delivery
                    </span>
                    <span className="mt-1 block text-[13px] text-muted">
                      {codAvailable === false
                        ? 'Cash on Delivery is not available for this pincode.'
                        : `Pay ${formatINR(totals.totalPaise)} in cash on delivery.`}
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 border p-4 ${
                    paymentMethod === 'razorpay' ? 'border-ink' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-5 w-5" aria-hidden /> UPI / Cards / Netbanking
                      <span className="text-[12px] font-normal text-muted">(Razorpay)</span>
                    </span>
                    <span className="mt-1 block text-[13px] text-muted">
                      You pay {formatINR(totals.totalPaise)} now via Razorpay.
                    </span>
                  </span>
                </label>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep(2)} className="btn btn-outline">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button type="button" onClick={() => setStep(4)} className="btn">
                  Review Order <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* Step 4 — Review */}
          {step === 4 && confirmedAddress && (
            <section aria-label="Review your order">
              <h2 className="mb-5 text-lg">Review your order</h2>

              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted">
                Items ({items.length})
              </h3>
              <ul className="mb-6 divide-y divide-line border-y border-line">
                {items.map((item) => (
                  <li
                    key={`${item.productId}__${item.variantId}`}
                    className="flex items-center gap-4 py-3"
                  >
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
                    <p className="text-sm font-semibold">
                      {formatINR(item.unitPaise * item.qty)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <div className="border border-line p-4 text-sm">
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-muted">
                    Deliver to
                  </h3>
                  <p>{formatAddress(confirmedAddress)}</p>
                </div>
                <div className="border border-line p-4 text-sm">
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-muted">
                    Contact
                  </h3>
                  <p>{contact.fullName}</p>
                  <p className="text-muted">{contact.email}</p>
                  <p className="text-muted">{contact.phone}</p>
                </div>
              </div>

              <div className="mb-6 border border-line p-4 text-sm">
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-muted">
                  Payment
                </h3>
                <p>
                  {paymentMethod === 'cod'
                    ? `Cash on Delivery — pay ${formatINR(totals.totalPaise)} in cash when your order arrives.`
                    : `Pay ${formatINR(totals.totalPaise)} now via Razorpay (UPI / cards / netbanking).`}
                </p>
              </div>

              {payError && (
                <p role="alert" className="mb-4 border border-sale/40 bg-sale/5 p-3 text-sm text-sale">
                  {payError}
                </p>
              )}

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep(3)} className="btn btn-outline">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={processing}
                  className="btn disabled:opacity-60"
                >
                  {processing ? 'Placing your order…' : 'Place Order'}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Order summary sidebar */}
        <aside className="h-fit border border-line p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-[15px] font-semibold">Order summary</h2>
          <dl className="space-y-2.5 text-[14px]">
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
              <dd>{totals.shippingPaise === 0 ? 'FREE' : formatINR(totals.shippingPaise)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5 font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(totals.totalPaise)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-muted">
            Totals are estimated — the server calculates the final amount.
          </p>
        </aside>
      </div>
    </div>
  );
}
