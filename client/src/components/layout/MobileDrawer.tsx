import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { NAV_ITEMS } from './nav';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Site navigation">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="absolute left-0 top-0 bottom-0 w-[86vw] max-w-[340px] bg-white flex flex-col animate-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <span className="font-head font-bold text-lg uppercase tracking-wide2">RD_COLLECTION</span>
          <button type="button" aria-label="Close navigation menu" onClick={onClose} className="p-2 -mr-2">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Mobile">
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="border-b border-line/60">
              {item.children ? (
                <>
                  <button
                    type="button"
                    aria-expanded={expanded === item.label}
                    onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                    className="w-full flex items-center justify-between px-5 py-3.5 font-head font-medium text-sm uppercase tracking-widest"
                  >
                    {item.label}
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${expanded === item.label ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded === item.label && (
                    <div className="pb-2 bg-paper/60">
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className="block px-8 py-2.5 text-sm font-medium text-gold"
                      >
                        View all {item.label}
                      </Link>
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.to}
                          onClick={onClose}
                          className="block px-8 py-2.5 text-sm text-muted hover:text-ink"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={`block px-5 py-3.5 font-head font-medium text-sm uppercase tracking-widest ${
                    item.label === 'Sale' ? 'text-sale' : ''
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line flex gap-3">
          <Link to="/login" onClick={onClose} className="btn btn-outline btn-block !px-4 !py-2.5 text-xs">
            Sign In
          </Link>
          <Link to="/wishlist" onClick={onClose} className="btn btn-outline btn-block !px-4 !py-2.5 text-xs">
            Wishlist
          </Link>
        </div>
      </div>
    </div>
  );
}
