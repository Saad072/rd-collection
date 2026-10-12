import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../../types';
import ProductCard from './ProductCard';

interface SectionHeadProps {
  title: string;
  subtitle?: string;
  link?: { label: string; to: string };
}

export function SectionHead({ title, subtitle, link }: SectionHeadProps) {
  return (
    <div className="text-center mb-7 px-4">
      <h2 className="text-[clamp(20px,4vw,30px)]">{title}</h2>
      {subtitle && <p className="text-muted text-[13px] mt-2 tracking-wide">{subtitle}</p>}
      {link && (
        <Link to={link.to} className="link-arrow mt-3">
          {link.label}
        </Link>
      )}
    </div>
  );
}

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  link?: { label: string; to: string };
}

export function ProductCarousel({ title, subtitle, products, link }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-14" aria-label={title}>
      <div className="max-w-[1240px] mx-auto px-4">
        <SectionHead title={title} subtitle={subtitle} link={link} />
        <div className="relative">
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
          >
            {products.map((p) => (
              <div
                key={p._id}
                className="flex-shrink-0 w-[44vw] max-w-[260px] md:w-[23%] snap-start"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          {products.length > 4 && (
            <>
              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                onClick={() => scroll(-1)}
                className="hidden md:flex absolute -left-5 top-1/3 w-10 h-10 bg-white border border-line items-center justify-center shadow hover:border-ink"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${title} right`}
                onClick={() => scroll(1)}
                className="hidden md:flex absolute -right-5 top-1/3 w-10 h-10 bg-white border border-line items-center justify-center shadow hover:border-ink"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
