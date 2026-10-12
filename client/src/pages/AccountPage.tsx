import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ErrorState from '../components/feedback/ErrorState';
import { Breadcrumbs, Modal, StatusBadge, formatDate, formatINR, toast } from './_local/ui';
import { zodResolver } from './_local/rhf';
import { AddressForm, addressSchema } from '../components/forms/AddressForm';
import type { AddressFormValues } from '../components/forms/AddressForm';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Address, Order } from '../types';

const DEVICE_KEY = 'rdc-addresses';

const EMPTY_ADDRESS: AddressFormValues = {
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

function addressSummary(a: Address): string {
  const parts = [a.fullName, a.addressLine, a.locality, `${a.city}, ${a.state} ${a.pincode}`].filter(
    Boolean,
  );
  return parts.join(' · ');
}

export default function AccountPage() {
  const { user, loading, logout } = useAuthStore();
  const navigate = useNavigate();

  const [book, setBook] = useState<Address[]>(() => readDeviceAddresses());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const addrForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY_ADDRESS,
  });

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .orders.list()
      .then((o) => {
        if (alive) setOrders(o);
      })
      .catch((e) => {
        if (alive) {
          setOrdersError(
            e instanceof ApiError ? e.message : 'Could not load your recent orders.',
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: '/account' }} replace />;
  }

  const persistBook = (list: Address[]) => {
    setBook(list);
    try {
      localStorage.setItem(DEVICE_KEY, JSON.stringify(list));
    } catch {
      // Storage unavailable — in-memory list still works for this session.
    }
  };

  const openAdd = () => {
    setEditingIndex(null);
    addrForm.reset(EMPTY_ADDRESS);
    setModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    const a = book[index];
    if (a) {
      addrForm.reset({
        fullName: a.fullName,
        phone: a.phone,
        email: a.email ?? '',
        addressLine: a.addressLine,
        locality: a.locality ?? '',
        landmark: a.landmark ?? '',
        city: a.city,
        state: a.state,
        pincode: a.pincode,
      });
      setModalOpen(true);
    }
  };

  const deleteAddress = (index: number) => {
    if (!window.confirm('Delete this saved address?')) return;
    persistBook(book.filter((_, i) => i !== index));
    toast('Address deleted');
  };

  const saveAddress = addrForm.handleSubmit((values) => {
    const list =
      editingIndex === null
        ? [...book, values]
        : book.map((b, i) => (i === editingIndex ? values : b));
    persistBook(list);
    setModalOpen(false);
    toast('Address saved');
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const recent = orders ? orders.slice(0, 5) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My Account' }]} />
      <h1 className="mb-8 text-2xl">My Account</h1>

      {/* Profile */}
      <section aria-label="Profile" className="mb-10 border border-line p-6">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-muted">
          Profile
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="mt-1 font-medium">{user?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="mt-1 font-medium">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="mt-1 font-medium">{user?.phone ?? 'Not provided'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[13px] text-muted">
          Profile editing is not available yet — contact support to update details.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn-outline mt-6 disabled:opacity-60"
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>

      {/* Address book */}
      <section aria-label="Address book" className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            Saved addresses (this device)
          </h2>
          <button type="button" onClick={openAdd} className="btn btn-outline">
            <Plus className="h-4 w-4" aria-hidden /> Add address
          </button>
        </div>
        {book.length === 0 ? (
          <p className="border border-dashed border-line p-6 text-center text-sm text-muted">
            No addresses saved on this device yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {book.map((a, i) => (
              <li key={`${a.pincode}-${i}`} className="border border-line p-5 text-sm">
                <p className="mb-3">{addressSummary(a)}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(i)}
                    className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAddress(i)}
                    className="flex items-center gap-1.5 text-[13px] text-muted hover:text-sale"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent orders */}
      <section aria-label="Recent orders">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            Recent orders
          </h2>
          <Link to="/account/orders" className="link-arrow text-sm">
            View all orders
          </Link>
        </div>
        {ordersError ? (
          <ErrorState message={ordersError} onRetry={() => window.location.reload()} />
        ) : orders === null ? (
          <div className="space-y-3">
            {[0, 1].map((n) => (
              <div key={n} className="h-16 animate-pulse bg-paper" aria-hidden />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="border border-dashed border-line p-6 text-center text-sm text-muted">
            You have no orders yet.{' '}
            <Link to="/" className="underline hover:text-ink">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {recent.map((o) => (
              <li key={o._id}>
                <Link
                  to={`/account/orders/${o._id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm hover:bg-paper"
                >
                  <span className="font-semibold">#{o.orderNumber}</span>
                  <span className="text-muted">{formatDate(o.createdAt)}</span>
                  <StatusBadge status={o.status} />
                  <span className="ml-auto font-semibold">{formatINR(o.totalPaise)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add / edit address modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingIndex === null ? 'Add address' : 'Edit address'}
      >
        <form onSubmit={saveAddress} className="space-y-4" noValidate>
          <AddressForm
            register={addrForm.register}
            errors={(addrForm.formState.errors ?? {}) as never}
            idPrefix="book"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button type="submit" className="btn">
              Save address
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
