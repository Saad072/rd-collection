import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import SearchOverlay from './SearchOverlay';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export default function Header({ onOpenMobileNav }: HeaderProps) {
  const count = useCartStore((s) => s.count());
  const openDrawer = useCartStore((s) => s.openDrawer);
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="max-w-[1240px] mx-auto px-4 h-16 flex items-center gap-4">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2"
            aria-label="Open navigation menu"
            aria-expanded={false}
            onClick={onOpenMobileNav}
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>

          <Link to="/" className="font-head font-bold text-xl tracking-wide2 uppercase" aria-label="RD_COLLECTION home">
            RD_COLLECTION
          </Link>

          <nav className="hidden lg:flex items-center gap-6 ml-8" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.children ? item.label : null)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link
                  to={item.to}
                  aria-haspopup={item.children ? 'true' : undefined}
                  aria-expanded={item.children ? openMenu === item.label : undefined}
                  onFocus={() => setOpenMenu(item.children ? item.label : null)}
                  onClick={() => setOpenMenu(null)}
                  className={`font-head font-medium text-[13px] uppercase tracking-widest py-5 ${
                    item.label === 'Sale' ? 'text-sale' : 'text-ink hover:text-gold'
                  }`}
                >
                  {item.label}
                </Link>
                {item.children && openMenu === item.label && (
                  <div
                    className="absolute left-0 top-full min-w-[220px] bg-white border border-line shadow-lg py-2 z-50"
                    onMouseEnter={() => setOpenMenu(item.label)}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.to}
                        onClick={() => setOpenMenu(null)}
                        className="block px-5 py-2.5 text-sm hover:bg-paper focus:bg-paper"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="p-2.5 hover:text-gold"
            >
              <Search size={20} strokeWidth={1.8} />
            </button>
            <Link
              to={user ? '/account' : '/login'}
              aria-label={user ? 'My account' : 'Sign in'}
              className="p-2.5 hover:text-gold"
            >
              <User size={20} strokeWidth={1.8} />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="p-2.5 hover:text-gold hidden sm:block">
              <Heart size={20} strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              aria-label={`Shopping bag, ${count} items`}
              onClick={openDrawer}
              className="p-2.5 hover:text-gold relative"
            >
              <ShoppingBag size={20} strokeWidth={1.8} />
              {count > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-sale text-white text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
