/**
 * Page-local UI helpers (fallback) — ONLY pieces with no real shared counterpart.
 *
 * NOTE FOR INTEGRATION: the real shared components now exist — use them:
 *   ProductCard            -> ../../components/product/ProductCard (default, { product })
 *   ProductCarousel        -> ../../components/product/ProductCarousel (named, { title, subtitle?, products, link? })
 *   SectionHead            -> ../../components/product/ProductCarousel (named, { title, subtitle?, link? })
 *   CartDrawer             -> ../../components/cart/CartDrawer (default, no props)
 *   QtyStepper             -> ../../components/feedback/QtyStepper (default, { qty,min?,max?,onChange,label? })
 *   SizeGuideModal         -> ../../components/feedback/SizeGuideModal (default, { open,onClose })
 *   EmptyState             -> ../../components/feedback/EmptyState (default, { title,message,action?:{label,to} })
 *   ErrorState             -> ../../components/feedback/ErrorState (default, { message,onRetry? })
 *   ProductCardSkeleton / ProductGridSkeleton -> ../../components/feedback/ProductCardSkeleton (named)
 *
 * This module keeps: Breadcrumbs, Modal, Drawer, Pagination, Price, Toaster/toast,
 * RulerButton, resolveImage and product-variant helpers — none of which exist as
 * shared components.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Ruler, X } from 'lucide-react';
import type { OrderStatus, Product, Variant } from '../../types';
import { discountPct, formatINR } from '../../lib/pricing';
export { formatINR };

/* ---------------- helpers ---------------- */

export function resolveImage(url: string | undefined): string {
  return url || '';
}

function activeVariants(p: Product): Variant[] {
  return p.variants.filter((v) => v.active);
}

export function priceRange(p: Product): { price: number; compareAt?: number } {
  const vs = activeVariants(p);
  if (vs.length === 0) return { price: 0 };
  const price = Math.min(...vs.map((v) => v.pricePaise));
  const comps = vs.map((v) => v.compareAtPaise).filter((c): c is number => !!c && c > 0);
  return { price, compareAt: comps.length > 0 ? Math.min(...comps) : undefined };
}

export function totalStock(p: Product): number {
  return p.variants.reduce((n, v) => n + (v.active ? v.stock : 0), 0);
}

export function uniqueSizes(p: Product): string[] {
  const seen: string[] = [];
  for (const v of p.variants) {
    if (v.active && !seen.includes(v.size)) seen.push(v.size);
  }
  return seen;
}

export function uniqueColors(p: Product): string[] {
  const seen: string[] = [];
  for (const v of p.variants) {
    if (v.active && !seen.includes(v.color)) seen.push(v.color);
  }
  return seen;
}

/** Find the variant matching a size+color selection. */
export function findVariant(
  p: Product,
  size: string | null,
  color: string | null,
): Variant | undefined {
  return p.variants.find(
    (v) => v.active && (size === null || v.size === size) && (color === null || v.color === color),
  );
}

/* ---------------- Price ---------------- */

export function Price({
  paise,
  compareAtPaise,
  size = 'md',
}: {
  paise: number;
  compareAtPaise?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const pct = discountPct(paise, compareAtPaise);
  const main = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-[15px]';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-semibold text-sale ${main}`}>{formatINR(paise)}</span>
      {compareAtPaise && compareAtPaise > paise && (
        <span className="text-[13px] text-muted line-through">{formatINR(compareAtPaise)}</span>
      )}
      {pct > 0 && (
        <span className="text-[11px] font-semibold uppercase tracking-widest text-sale">
          Save {pct}%
        </span>
      )}
    </div>
  );
}

/* ---------------- Breadcrumbs ---------------- */

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px] uppercase tracking-widest text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : ''}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        className={`relative max-h-[92vh] w-full overflow-auto bg-white p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center border border-line hover:border-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Drawer (generic side panel) ---------------- */

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const pos = side === 'right' ? 'right-0' : 'left-0';
  return (
    <div className="fixed inset-0 z-[400]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className={`absolute bottom-0 top-0 ${pos} flex w-[min(420px,94vw)] flex-col bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[15px]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-9 w-9 items-center justify-center hover:bg-paper"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Pagination ---------------- */

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p += 1) pages.push(p);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
        className="flex h-10 w-10 items-center justify-center border border-line disabled:opacity-40 hover:border-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Page ${p}`}
          className={`h-10 min-w-[2.5rem] border px-2 text-sm ${
            p === page ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
        className="flex h-10 w-10 items-center justify-center border border-line disabled:opacity-40 hover:border-ink"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}

/* ---------------- toast ---------------- */

interface ToastMsg {
  id: number;
  text: string;
}

type ToastListener = (items: ToastMsg[]) => void;
let toastListeners: ToastListener[] = [];
let toastItems: ToastMsg[] = [];
let toastSeq = 0;

export function toast(text: string): void {
  const id = ++toastSeq;
  toastItems = [...toastItems, { id, text }];
  toastListeners.forEach((l) => l(toastItems));
  window.setTimeout(() => {
    toastItems = toastItems.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l(toastItems));
  }, 2600);
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setItems);
    };
  }, []);
  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[600] flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
    >
      {items.map((t) => (
        <div key={t.id} className="bg-ink px-5 py-2.5 text-[13px] text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- misc ---------------- */

export function RulerButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="link-arrow">
      <Ruler className="h-3.5 w-3.5" aria-hidden /> Size guide
    </button>
  );
}

/* ---------------- orders ---------------- */

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: 'bg-gold/15 text-[#8a6d1f]',
  confirmed: 'bg-paper text-ink',
  processing: 'bg-paper text-ink',
  shipped: 'bg-paper text-ink',
  delivered: 'bg-green-50 text-green-800',
  cancelled: 'bg-sale/10 text-sale',
  return_requested: 'bg-gold/15 text-[#8a6d1f]',
  returned: 'bg-paper text-muted',
  refund_pending: 'bg-gold/15 text-[#8a6d1f]',
  refunded: 'bg-paper text-muted',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${STATUS_TONE[status] ?? 'bg-paper text-ink'}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

/** Valid admin fulfillment transitions (no arbitrary jumps). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['return_requested'],
  return_requested: ['returned', 'refund_pending'],
  refund_pending: ['refunded'],
  cancelled: [],
  returned: [],
  refunded: [],
};

/** Whether a customer may cancel their own order. */
export function isCancellable(status: OrderStatus): boolean {
  return status === 'pending_payment' || status === 'confirmed';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
