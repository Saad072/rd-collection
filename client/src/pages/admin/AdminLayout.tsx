import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', end: false, label: 'Products', icon: Package },
  { to: '/admin/orders', end: false, label: 'Orders', icon: ShoppingCart },
  { to: '/admin/collections', end: false, label: 'Collections', icon: Layers },
  { to: '/admin/coupons', end: false, label: 'Coupons', icon: Ticket },
  { to: '/admin/banners', end: false, label: 'Banners', icon: ImageIcon },
  { to: '/admin/customers', end: false, label: 'Customers', icon: Users },
];

export default function AdminLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap ${
      isActive ? 'bg-ink text-white' : 'text-ink hover:bg-paper'
    }`;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* mobile top nav */}
      <div className="border-b border-line md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-widest">RD Admin</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Logout
          </button>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-line md:flex md:flex-col">
        <div className="border-b border-line px-5 py-5">
          <p className="text-sm font-semibold uppercase tracking-widest">RD Collection</p>
          <p className="mt-0.5 text-xs text-muted">Admin panel</p>
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <NavLink to="/" className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-paper">
            <ExternalLink className="h-4 w-4" aria-hidden />
            View store
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-paper hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
