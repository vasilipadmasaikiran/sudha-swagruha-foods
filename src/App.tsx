// ============================================================
// Main App Router
// ============================================================
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';

// Pages
import HomePage from '@/pages/HomePage';
import ProductsPage from '@/pages/ProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CategoryPage from '@/pages/CategoryPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderSuccessPage from '@/pages/OrderSuccessPage';
import TrackOrderPage from '@/pages/TrackOrderPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import AdminPage from '@/pages/AdminPage';
import AdminConsolePage from '@/pages/AdminConsolePage';

// Scroll to top on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

import { useProductStore } from '@/hooks/useProductStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAboutStore } from '@/hooks/useAboutStore';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/admin-console');
  
  const { fetchProducts, fetchCatalogAndSettings, subscribeToCatalogAndSettings } = useProductStore();
  const { fetchSettings, subscribeToSettings } = useSettingsStore();
  const { fetchAboutContent, subscribeToAboutRealtime } = useAboutStore();
  
  useEffect(() => {
    // Initial fetch from cloud database
    fetchProducts();
    fetchCatalogAndSettings();
    fetchSettings();
    fetchAboutContent();

    // Subscribe to live changes so customer storefront updates in real-time
    const unsubCatalog = subscribeToCatalogAndSettings();
    const unsubSettings = subscribeToSettings();
    const unsubAbout = subscribeToAboutRealtime();

    return () => {
      unsubCatalog();
      unsubSettings();
      unsubAbout();
    };
  }, [fetchProducts, fetchCatalogAndSettings, subscribeToCatalogAndSettings, fetchSettings, subscribeToSettings, fetchAboutContent, subscribeToAboutRealtime]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </div>
  );
}

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/about-us" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin-console" element={<AdminConsolePage />} />
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/admin/*" element={<AdminConsolePage />} />
        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-brand-cream">
              <div className="text-center">
                <p className="text-8xl mb-4">🫙</p>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Page Not Found</h1>
                <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
                <a
                  href="/"
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors"
                >
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const base = import.meta.env.BASE_URL;

  return (
    <BrowserRouter basename={base}>
      <ScrollToTop />
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1a1a1a',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#2F6B3B', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#C62828', secondary: '#fff' },
          },
        }}
      />
    </BrowserRouter>
  );
}
