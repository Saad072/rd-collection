import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { computeTotals, formatINR, nextMilestone } from '../../lib/pricing';
import QtyStepper from '../feedback/QtyStepper';
import EmptyState from '../feedback/EmptyState';

/** No props — open state lives in the cart store so the header, product page,
 * or any component can open the drawer via `useCartStore(s => s.openDrawer)`. */
export default function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const onClose = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotalPaise());
  const navigate = useNavigate();

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

  const totals = computeTotals(subtotal);
  const milestone = nextMilestone(subtotal);

  const checkout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 bottom-0 w-[min(400px,94vw)] bg-white flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-base">Shopping Bag</h2>
          <button type="button" aria-label="Close bag" onClick={onClose} className="p-2 -mr-2">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              title="Your bag is empty"
              message="Beautiful ethnic wear is waiting for you."
              action={{ label: 'Start Shopping', to: '/' }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {items.map((item) => (
                <div key={`${item.productId}__${item.variantId}`} className="flex gap-3 pb-4 border-b border-line">
                  <Link to={`/products/${item.slug}`} onClick={onClose} className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[76px] aspect-[3/4] object-cover bg-paper"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.slug}`} onClick={onClose} className="hover:text-gold">
                      <p className="text-[13px] font-medium leading-snug line-clamp-2">{item.name}</p>
                    </Link>
                    <p className="text-xs text-muted mt-1">
                      {item.size}
                      {item.color ? ` · ${item.color}` : ''}
                    </p>
                    <p className="font-semibold text-sm mt-1.5">{formatINR(item.unitPaise * item.qty)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <QtyStepper
                        qty={item.qty}
                        min={1}
                        max={99}
                        onChange={(q) => setQty(item.productId, item.variantId, q)}
                        label={`Quantity for ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-xs text-muted underline underline-offset-2 hover:text-sale"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3.5 border-t border-line bg-paper">
              <p className="text-xs mb-2 leading-relaxed">{milestone.label}</p>
              <div className="h-2 bg-line relative" role="progressbar" aria-valuenow={milestone.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Offer progress">
                <div className="absolute left-0 top-0 bottom-0 bg-ink transition-all duration-300" style={{ width: `${milestone.progress}%` }} />
              </div>
              <p className="text-[10px] text-muted mt-1.5 uppercase tracking-widest">
                ₹750 free ship · ₹1999 ₹200 off · ₹2999 ₹350 off
              </p>
            </div>

            <div className="px-5 py-4 border-t border-line space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatINR(totals.subtotalPaise)}</span>
              </div>
              {totals.discountPaise > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Offer discount</span>
                  <span>− {formatINR(totals.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{totals.freeShipping ? 'FREE' : formatINR(totals.shippingPaise)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[15px] pt-1">
                <span>Total</span>
                <span>{formatINR(totals.totalPaise)}</span>
              </div>
              <button type="button" onClick={checkout} className="btn btn-block mt-3">
                Checkout
              </button>
              <p className="text-[11px] text-muted text-center mt-2">Cash on Delivery available</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
