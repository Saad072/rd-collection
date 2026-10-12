import { useEffect, useState } from 'react';
import { useWishlistStore } from '../store/useWishlistStore';
import { api } from '../services/api';
import type { Product } from '../types';
import { Breadcrumbs } from './_local/ui';
import ProductCard from '../components/product/ProductCard';
import EmptyState from '../components/feedback/EmptyState';
import { ProductGridSkeleton } from '../components/feedback/ProductCardSkeleton';

export default function WishlistPage() {
  const slugs = useWishlistStore((s) => s.slugs);
  const clear = useWishlistStore((s) => s.clear);

  const [products, setProducts] = useState<Product[]>([]);
  const [failed, setFailed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setProducts([]);
      setFailed(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(slugs.map((s) => api.getProduct(s))).then((rs) => {
      if (cancelled) return;
      const ok: Product[] = [];
      let misses = 0;
      for (const r of rs) {
        if (r.status === 'fulfilled') ok.push(r.value);
        else misses += 1;
      }
      setProducts(ok);
      setFailed(misses);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  const clearWishlist = () => {
    if (window.confirm('Remove all items from your wishlist?')) {
      clear();
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

      <div className="text-center pt-2 pb-8">
        <h1 className="text-[clamp(24px,4vw,36px)]">Wishlist</h1>
        {!loading && slugs.length > 0 && (
          <p className="text-[13px] text-muted mt-3 tracking-wide">
            {slugs.length} {slugs.length === 1 ? 'piece' : 'pieces'} saved
          </p>
        )}
      </div>

      {loading && <ProductGridSkeleton count={8} />}

      {!loading && slugs.length === 0 && (
        <EmptyState
          title="Your wishlist is empty"
          message="Tap the heart on any product to save it here for later."
          action={{ label: 'Discover products', to: '/' }}
        />
      )}

      {!loading && slugs.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            {failed > 0 ? (
              <p className="text-sm text-muted">
                {failed} {failed === 1 ? 'item' : 'items'} couldn&rsquo;t be loaded and were skipped.
              </p>
            ) : (
              <span aria-hidden />
            )}
            <button type="button" onClick={clearWishlist} className="link-arrow text-[13px]">
              Clear wishlist
            </button>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing to show"
              message="Your saved pieces could not be loaded right now. Please try again later."
            />
          )}
        </>
      )}
    </div>
  );
}
