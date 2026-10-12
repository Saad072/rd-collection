import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, RefreshCcw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import type { Banner, Product } from '../types';
import AnnounceBar from '../components/layout/AnnounceBar';
import Header from '../components/layout/Header';
import MobileDrawer from '../components/layout/MobileDrawer';
import Footer from '../components/layout/Footer';
import CartDrawer from '../components/cart/CartDrawer';
import { ProductCarousel } from '../components/product/ProductCarousel';
import { ProductGridSkeleton } from '../components/feedback/ProductCardSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import { useCartStore } from '../store/useCartStore';

const CATEGORY_TILES: { label: string; to: string; img: string }[] = [
  { label: 'Kurta & Kurti', to: '/collections/kurta-kurti', img: '/images/products/p01.jpg' },
  { label: 'Sarees', to: '/collections/sarees', img: '/images/products/p09.jpg' },
  { label: 'Ethnic Sets', to: '/collections/ethnic-sets', img: '/images/products/p07.jpg' },
  { label: 'Workwear', to: '/collections/workwear', img: '/images/products/p05.jpg' },
  { label: 'Fusion Wear', to: '/collections/fusion-wear', img: '/images/products/p11.jpg' },
  { label: 'New Arrivals', to: '/collections/new-arrivals', img: '/images/products/p02.jpg' },
  { label: 'Festive', to: '/collections/festive', img: '/images/products/p08.jpg' },
  { label: 'Sale', to: '/collections/sale', img: '/images/products/p12.jpg' },
];

function useProducts(fetcher: () => Promise<Product[]>) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((list) => {
        if (alive) setProducts(list);
      })
      .catch(() => {
        if (alive) setError('Could not load products. Please check your connection.');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { products, error, retry: () => setError(null) };
}

function CollectionSection(props: {
  title: string;
  subtitle?: string;
  link: { label: string; to: string };
  fetch: () => Promise<Product[]>;
}) {
  const { products, error } = useProducts(props.fetch);
  if (error) return <ErrorState message={error} />;
  if (products === null)
    return (
      <section className="py-10 md:py-14" aria-label={props.title}>
        <div className="max-w-[1240px] mx-auto px-4">
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    );
  if (products.length === 0) return null; // never render empty sections
  return <ProductCarousel title={props.title} subtitle={props.subtitle} products={products} link={props.link} />;
}

function Hero() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .getBanners('home-hero')
      .then((b) => {
        if (alive) setBanners(b.filter((x) => x.active));
      })
      .catch(() => {
        if (alive) setBanners([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const fallback = (
    <section className="relative overflow-hidden bg-paper" aria-label="Featured campaign">
      <img
        src="/images/hero.jpg"
        alt="RD_COLLECTION — new season ethnic wear"
        className="w-full h-[62vw] max-h-[560px] min-h-[300px] object-cover"
        fetchPriority="high"
      />
      <div className="absolute inset-0 flex flex-col justify-center items-start px-[8vw] gap-3.5">
        <span className="font-head uppercase tracking-wide2 text-xs font-semibold text-white bg-ink/55 px-3 py-1.5">
          New Season · Made in India
        </span>
        <h1 className="text-white text-[clamp(26px,6vw,54px)] [text-shadow:0_2px_12px_rgba(0,0,0,.45)] max-w-[14em]">
          Everyday Ethnic, Elevated
        </h1>
        <p className="text-white text-sm max-w-[34em] [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
          Kurta sets, sarees and workwear in breathable fabrics and sizes XS to 6XL — priced honestly,
          delivered to your door.
        </p>
        <Link to="/collections/new-arrivals" className="btn mt-2">
          Shop Now
        </Link>
      </div>
    </section>
  );

  if (banners === null || banners.length === 0) return fallback;

  const current = banners[index % banners.length];
  return (
    <section className="relative overflow-hidden bg-paper" aria-label="Featured campaign">
      {current.ctaUrl ? (
        <Link to={current.ctaUrl} aria-label={current.title || 'Shop the campaign'}>
          <HeroImage banner={current} />
        </Link>
      ) : (
        <HeroImage banner={current} />
      )}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((b, i) => (
            <button
              key={b._id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 ${i === index % banners.length ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroImage({ banner }: { banner: Banner }) {
  return (
    <>
      <img
        src={banner.imageUrl}
        alt={banner.title || 'RD_COLLECTION campaign'}
        className="w-full h-[62vw] max-h-[560px] min-h-[300px] object-cover"
        fetchPriority="high"
      />
      {(banner.title || banner.ctaLabel) && (
        <div className="absolute inset-0 flex flex-col justify-center items-start px-[8vw] gap-3.5">
          {banner.title && (
            <h1 className="text-white text-[clamp(26px,6vw,54px)] [text-shadow:0_2px_12px_rgba(0,0,0,.45)] max-w-[14em]">
              {banner.title}
            </h1>
          )}
          {banner.subtitle && (
            <p className="text-white text-sm max-w-[34em] [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
              {banner.subtitle}
            </p>
          )}
          {banner.ctaLabel && banner.ctaUrl && (
            <span className="btn mt-2">{banner.ctaLabel}</span>
          )}
        </div>
      )}
    </>
  );
}

function PromoBanner() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .getBanners('home-promo')
      .then((b) => {
        if (alive) setBanners(b.filter((x) => x.active));
      })
      .catch(() => {
        if (alive) setBanners([]);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!banners || banners.length === 0) return null;
  const b = banners[0];
  const inner = (
    <img src={b.imageUrl} alt={b.title || 'Promotion'} loading="lazy" className="w-full object-cover" />
  );
  return (
    <section className="max-w-[1240px] mx-auto px-4 py-6" aria-label={b.title || 'Promotion'}>
      {b.ctaUrl ? <Link to={b.ctaUrl}>{inner}</Link> : inner}
    </section>
  );
}

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Subscribe so the header cart badge re-renders on cart changes
  useCartStore((s) => s.items);

  return (
    <div className="min-h-screen flex flex-col">
      <AnnounceBar />
      <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
      <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <CartDrawer />

      <main className="flex-1">
        <Hero />

        <section className="py-10 md:py-14" aria-label="Shop by category">
          <div className="max-w-[1240px] mx-auto px-4">
            <div className="text-center mb-7 px-4">
              <h2 className="text-[clamp(20px,4vw,30px)]">Shop by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {CATEGORY_TILES.map((c) => (
                <Link key={c.label} to={c.to} className="relative block overflow-hidden group">
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-0 right-0 bottom-0 bg-white/95 text-center py-2.5 font-head font-medium text-sm uppercase tracking-widest">
                    {c.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CollectionSection
          title="Featured Collection"
          subtitle="Handpicked styles for the season"
          link={{ label: 'View All', to: '/collections/featured' }}
          fetch={() => api.getCollection('featured', { pageSize: 10 }).then((r) => r.products.items)}
        />

        <CollectionSection
          title="Festive Edit"
          subtitle="Celebration-ready ethnic wear"
          link={{ label: 'View All', to: '/collections/festive' }}
          fetch={() => api.getCollection('festive', { pageSize: 10 }).then((r) => r.products.items)}
        />

        <CollectionSection
          title="Saree Collection"
          subtitle="Six yards of everyday grace"
          link={{ label: 'View All', to: '/collections/sarees' }}
          fetch={() => api.getProducts({ category: 'sarees', pageSize: 10 }).then((r) => r.items)}
        />

        <CollectionSection
          title="Workwear"
          subtitle="Polished, comfortable office ethnic"
          link={{ label: 'View All', to: '/collections/workwear' }}
          fetch={() => api.getCollection('workwear', { pageSize: 10 }).then((r) => r.products.items)}
        />

        <CollectionSection
          title="Everyday Kurtas"
          subtitle="Easy styles for daily wear"
          link={{ label: 'View All', to: '/collections/kurta-kurti' }}
          fetch={() => api.getProducts({ category: 'kurta-kurti', pageSize: 10 }).then((r) => r.items)}
        />

        <CollectionSection
          title="New Arrivals"
          subtitle="Fresh styles, just landed"
          link={{ label: 'View All', to: '/collections/new-arrivals' }}
          fetch={() => api.getProducts({ sort: 'newest', pageSize: 10 }).then((r) => r.items)}
        />

        <PromoBanner />

        <section className="py-12 md:py-16 bg-paper border-y border-line" aria-label="About RD_COLLECTION">
          <div className="max-w-[720px] mx-auto px-4 text-center">
            <h2 className="text-[clamp(20px,4vw,28px)] mb-4">Made for Real Wardrobes</h2>
            <p className="text-sm text-muted leading-relaxed">
              RD_COLLECTION designs ethnic wear for the way India actually dresses — breathable
              cottons and rayons, honest pricing, and sizes from XS to 6XL. Every kurta set, saree
              and workwear piece is cut for comfort and made to be worn on repeat.
            </p>
            <Link to="/about" className="link-arrow mt-4">
              Our Story
            </Link>
          </div>
        </section>

        <section className="py-10" aria-label="Why shop with us">
          <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2 px-4">
              <Banknote size={28} strokeWidth={1.5} className="text-gold" />
              <h3 className="text-sm">Cash on Delivery</h3>
              <p className="text-xs text-muted">Pay at your doorstep, anywhere in India.</p>
            </div>
            <div className="flex flex-col items-center gap-2 px-4">
              <RefreshCcw size={28} strokeWidth={1.5} className="text-gold" />
              <h3 className="text-sm">7-Day Easy Exchange</h3>
              <p className="text-xs text-muted">Wrong size? Exchange it within 7 days.</p>
            </div>
            <div className="flex flex-col items-center gap-2 px-4">
              <ShieldCheck size={28} strokeWidth={1.5} className="text-gold" />
              <h3 className="text-sm">Made in India</h3>
              <p className="text-xs text-muted">Designed and stitched by Indian artisans.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
