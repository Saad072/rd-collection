import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Product } from '../../types';
import { discountPct, formatINR } from '../../lib/pricing';
import { useWishlistStore } from '../../store/useWishlistStore';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const toggle = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.has(product.slug));

  const inStock = product.variants.some((v) => v.active && v.stock > 0);
  const first = product.variants.find((v) => v.active) ?? product.variants[0];
  const pct = first ? discountPct(first.pricePaise, first.compareAtPaise) : 0;
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))].slice(0, 5);
  const sizes = [...new Set(product.variants.filter((v) => v.active).map((v) => v.size))].slice(0, 6);
  const img = product.images[0];

  return (
    <article className="relative flex flex-col bg-white group">
      <Link
        to={`/products/${product.slug}`}
        className="relative block overflow-hidden bg-paper aspect-[3/4]"
        aria-label={product.name}
      >
        {pct > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-sale text-white text-[11px] font-semibold px-2 py-1 uppercase tracking-wider">
            Save {pct}%
          </span>
        )}
        {product.isNew && pct === 0 && (
          <span className="absolute top-2 left-2 z-10 bg-ink text-white text-[11px] font-semibold px-2 py-1 uppercase tracking-wider">
            New
          </span>
        )}
        {img && (
          <img
            src={img.url}
            alt={img.alt || product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </Link>
      <button
        type="button"
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={wished}
        onClick={() => toggle(product.slug)}
        className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Heart size={17} strokeWidth={1.8} className={wished ? 'fill-sale text-sale' : 'text-ink'} />
      </button>

      <div className="pt-3 px-0.5 flex flex-col gap-1.5 flex-1">
        <Link to={`/products/${product.slug}`} className="hover:text-gold">
          <h3 className="text-[13px] font-normal normal-case tracking-normal leading-snug line-clamp-2 min-h-[2.6em]">
            {product.name}
          </h3>
        </Link>
        {first && (
          <p className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sale font-semibold text-[15px]">{formatINR(first.pricePaise)}</span>
            {first.compareAtPaise && first.compareAtPaise > first.pricePaise && (
              <span className="text-muted line-through text-[13px]">{formatINR(first.compareAtPaise)}</span>
            )}
          </p>
        )}
        {colors.length > 0 && (
          <p className="text-[11px] text-muted truncate" aria-label={`Colors: ${colors.join(', ')}`}>
            {colors.join(' · ')}
          </p>
        )}
        {sizes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-0.5" aria-label="Available sizes">
            {sizes.map((s) => (
              <span key={s} className="text-[10px] uppercase tracking-widest border border-line px-1.5 py-0.5 text-muted">
                {s}
              </span>
            ))}
          </div>
        )}
        {!inStock && <p className="text-xs text-sale font-medium mt-1">Out of stock</p>}
      </div>
    </article>
  );
}
