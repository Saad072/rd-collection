import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

/* Pages — Home is implemented here; the rest are provided by the pages worker. */
import Home from './pages/Home';
import CollectionPage from './pages/CollectionPage';
import ProductPage from './pages/ProductPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountPage from './pages/AccountPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import Contact from './pages/Contact';
import About from './pages/About';
import Faq from './pages/Faq';
import ShippingPolicy from './pages/ShippingPolicy';
import ReturnsPolicy from './pages/ReturnsPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsPage from './pages/TermsPage';
import NotFound from './pages/NotFound';

/* Global overlays: bag drawer + toast notifications (mounted once). */
import CartDrawer from './components/cart/CartDrawer';
import { Toaster } from './pages/_local/ui';

/* Admin pages — provided by the admin worker. */
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminCollections from './pages/admin/AdminCollections';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminBanners from './pages/admin/AdminBanners';
import AdminCustomers from './pages/admin/AdminCustomers';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Requires a signed-in customer. */
function ProtectedRoute() {
  const { user, loading, fetchMe } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user && loading) {
      fetchMe().finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Requires a signed-in admin. */
function AdminRoute() {
  const { user, loading, fetchMe } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user && loading) {
      fetchMe().finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScrollToTop />
      <CartDrawer />
      <Toaster />
      <Routes>
        {/* storefront */}
        <Route path="/" element={<Home />} />
        <Route path="/collections/:slug" element={<CollectionPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/wishlist" element={<WishlistPage />} />

        {/* customer account */}
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<OrdersPage />} />
          <Route path="/account/orders/:id" element={<OrderDetailPage />} />
        </Route>

        {/* content */}
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/returns-policy" element={<ReturnsPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id" element={<AdminProductForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="collections" element={<AdminCollections />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="customers" element={<AdminCustomers />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
