import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Truck, RotateCcw } from 'lucide-react';
import { z } from 'zod';
import type { Product } from '../types';
import { api, ApiError } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import {
  Breadcrumbs,
  Price,
  RulerButton,
  findVariant,
  priceRange,
  resolveImage,
  totalStock,
  uniqueColors,
  uniqueSizes,
  toast,
} from './_local/ui';
import { zodResolver } from './_local/rhf';
import { Field } from '../components/forms/Field';
import { ProductCarousel } from '../components/product/ProductCarousel';
import QtyStepper from '../components/feedback/QtyStepper';
import SizeGuideModal from '../components/feedback/SizeGuideModal';
import ErrorState from '../components/feedback/ErrorState';

const pincodeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});
type PincodeForm = z.infer<typeof pincodeSchema>;

interface RecentItem {
  slug: string;
  name: string;
  image: string;
  pricePaise: number;
  compareAtPaise?: number;
}

function prettySlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem('rdc-recent');
    const parsed: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export default function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const [pinResult, setPinResult] = useState<{ etaDays: [number, number]; cod: boolean } | null>(null);
  const [pinChecking, setPinChecking] = useState(false);
  const [pinApiError, setPinApiError] = useState<string | null>(null);

  const [recent, setRecent] = useState<RecentItem[]>([]);

  const touchStartX = useRef<number | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PincodeForm>({ resolver: zodResolver(pincodeSchema) });

  /* ---- load product ---- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setRelated([]);
    setSelectedIndex(0);
    setSize(null);
    setColor(null);
    setSizeError(null);
    setQty(1);
    setCartError(null);
    setPinResult(null);
    setPinApiError(null);

    (async () => {
      try {
        const p = await api.getProduct(slug);
        if (cancelled) return;
        setProduct(p);

        /* Preselect colour when there is only one option. */
        const colors = uniqueColors(p);
        if (colors.length === 1) setColor(colors[0]);

        /* Related products (same category, excluding self). */
        api
          .getProducts({ category: p.category, pageSize: 9 })
          .then((res) => {
            if (!cancelled) {
              setRelated(res.items.filter((r) => r.slug !== p.slug).slice(0, 8));
            }
          })
          .catch(() => {
            /* Related is a nice-to-have; never fail the page for it. */
          });

        /* Recently viewed. */
        const pr = priceRange(p);
        const items = loadRecent().filter((r) => r.slug !== p.slug);
        items.unshift({
          slug: p.slug,
          name: p.name,
          image: resolveImage(p.images[0]?.url),
          pricePaise: pr.price,
          compareAtPaise: pr.compareAt,
        });
        try {
          localStorage.setItem('rdc-recent', JSON.stringify(items.slice(0, 8)));
        } catch {
          /* Private browsing — viewing history just won't persist. */
        }
        setRecent(items.slice(1, 8));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load this product. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, reload]);

  const sizes = useMemo(() => (product ? uniqueSizes(product) : []), [product]);
  const colors = useMemo(() => (product ? uniqueColors(product) : []), [product]);

  const selectedVariant = useMemo(
    () => (product && size ? findVariant(product, size, color) : undefined),
    [product, size, color],
  );

  /* Reset qty whenever the chosen variant changes. */
  useEffect(() => {
    setQty(1);
  }, [selectedVariant?._id]);

  const images = product?.images ?? [];
  const mainImage = images[selectedIndex] ?? images[0];

  const goImage = (dir: 1 | -1) => {
    if (images.length < 2) return;
    setSelectedIndex((i) => (i + dir + images.length) % images.length);
  };

  const stockNote = useMemo(() => {
    if (!product) return null;
    if (selectedVariant) {
      if (selectedVariant.stock <= 0) return { text: 'Out of stock', tone: 'text-sale' };
      if (selectedVariant.stock <= 3)
        return { text: `Only ${selectedVariant.stock} left`, tone: 'text-sale' };
      return { text: 'In stock', tone: 'text-green-700' };
    }
    return totalStock(product) > 0
      ? { text: 'In stock', tone: 'text-green-700' }
      : { text: 'Out of stock', tone: 'text-sale' };
  }, [product, selectedVariant]);

  const attrRows = useMemo(() => {
    if (!product) return [];
    const rows: { label: string; value: string }[] = [];
    const attrs = product.attributes ?? {};
    const seen = new Set<string>();
    const fabric = product.fabric || attrs['Fabric'] || attrs['fabric'];
    if (fabric) {
      rows.push({ label: 'Fabric', value: fabric });
      seen.add('fabric');
    }
    for (const [k, v] of Object.entries(attrs)) {
      if (!v || seen.has(k.toLowerCase())) continue;
      rows.push({ label: k, value: v });
      seen.add(k.toLowerCase());
    }
    return rows;
  }, [product]);

  const descriptionParas = useMemo(
    () => (product ? product.description.split(/\n+/).map((p) => p.trim()).filter(Boolean) : []),
    [product],
  );

  /* ---- cart ---- */

  const addToBag = (): boolean => {
    if (!product) return false;
    if (!size) {
      setSizeError('Please select a size');
      setCartError(null);
      return false;
    }
    const variant = findVariant(product, size, color);
    if (!variant || variant.stock <= 0) {
      setCartError('Sorry, this combination is out of stock. Please choose another size or colour.');
      return false;
    }
    try {
      addItem({
        productId: product._id,
        variantId: variant._id,
        slug: product.slug,
        name: product.name,
        image: resolveImage(product.images[0]?.url),
        size: variant.size,
        color: variant.color,
        unitPaise: variant.pricePaise,
        qty,
      });
      setCartError(null);
      openDrawer();
      toast('Added to bag');
      return true;
    } catch (e) {
      setCartError(e instanceof Error ? e.message : 'Could not add to bag. Please try again.');
      return false;
    }
  };

  const buyNow = () => {
    addToBag();
  };

  /* ---- pincode ---- */

  const onPincode = async (data: PincodeForm) => {
    setPinChecking(true);
    setPinResult(null);
    setPinApiError(null);
    try {
      const res = await api.checkPincode(data.pincode);
      setPinResult({ etaDays: res.etaDays, cod: res.cod });
    } catch (e) {
      setPinApiError(e instanceof ApiError ? e.message : 'Could not check this pincode. Please try again.');
    } finally {
      setPinChecking(false);
    }
  };

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 pb-16" aria-hidden>
        <div className="py-4">
          <div className="h-3 bg-paper w-64" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 animate-pulse">
          <div>
            <div className="aspect-[3/4] bg-paper" />
            <div className="flex gap-2 mt-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-16 h-20 bg-paper" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="h-7 bg-paper w-3/4" />
            <div className="h-5 bg-paper w-40" />
            <div className="h-10 bg-paper w-56" />
            <div className="h-11 bg-paper w-full" />
            <div className="h-11 bg-paper w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 pb-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Product' }]} />
        <ErrorState message={error ?? 'Product not found.'} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  const range = priceRange(product);

  return (
    <div className="max-w-[1240px] mx-auto px-4 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: prettySlug(product.category), to: `/collections/${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        {/* gallery */}
        <div>
          <div
            className="relative aspect-[3/4] bg-paper overflow-hidden"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) > 40) goImage(dx < 0 ? 1 : -1);
            }}
          >
            {mainImage && (
              <img
                key={mainImage.url}
                src={mainImage.url}
                alt={mainImage.alt || product.name}
                className="w-full h-full object-cover"
              />
            )}
            {product.isNew && (
              <span className="absolute top-3 left-3 bg-ink text-white text-[11px] font-semibold px-2 py-1 uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="group" aria-label="Product images">
              {images.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-pressed={i === selectedIndex}
                  className={`w-16 h-20 flex-shrink-0 overflow-hidden border-2 ${
                    i === selectedIndex ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.alt || `${product.name} — view ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div className="pt-1">
          <h1 className="text-[clamp(22px,3.4vw,32px)] leading-tight">{product.name}</h1>

          <div className="mt-3">
            {selectedVariant ? (
              <Price paise={selectedVariant.pricePaise} compareAtPaise={selectedVariant.compareAtPaise} size="lg" />
            ) : (
              <Price paise={range.price} compareAtPaise={range.compareAt} size="lg" />
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-[13px]">
            {selectedVariant && <span className="text-muted">SKU: {selectedVariant.sku}</span>}
            {stockNote && <span className={`font-medium ${stockNote.tone}`}>{stockNote.text}</span>}
          </div>

          {/* size */}
          <div className="mt-6">
            <Field label="Size" required error={sizeError ?? undefined}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a size">
                {sizes.map((s) => {
                  const available = product.variants.some((v) => v.active && v.size === s && v.stock > 0);
                  return (
                    <button
                      key={s}
                      type="button"
                      className="size-pill"
                      disabled={!available}
                      aria-pressed={size === s}
                      onClick={() => {
                        setSize(s);
                        setSizeError(null);
                        setCartError(null);
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="mt-2 flex items-center justify-between">
              {(size || (color && colors.length > 1)) && (
                <button
                  type="button"
                  onClick={() => {
                    setSize(null);
                    if (colors.length > 1) setColor(null);
                    setSizeError(null);
                    setCartError(null);
                  }}
                  className="text-[13px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  Clear selection
                </button>
              )}
              <RulerButton onClick={() => setSizeGuideOpen(true)} />
            </div>
          </div>

          {/* colour */}
          {colors.length > 0 && (
            <div className="mt-5">
              <Field label="Colour">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a colour">
                  {colors.map((c) => {
                    const available = product.variants.some((v) => v.active && v.color === c && v.stock > 0);
                    return (
                      <button
                        key={c}
                        type="button"
                        className="size-pill"
                        disabled={!available}
                        aria-pressed={color === c}
                        onClick={() => {
                          setColor(c);
                          setCartError(null);
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {/* qty + actions */}
          <div className="mt-6 flex items-center gap-4">
            <Field label="Quantity">
              <QtyStepper
                qty={qty}
                min={1}
                max={selectedVariant ? Math.max(1, selectedVariant.stock) : 99}
                onChange={setQty}
                label="Quantity"
              />
            </Field>
          </div>

          <div className="mt-5 space-y-3">
            <button type="button" onClick={addToBag} className="btn btn-outline btn-block">
              Add to Bag
            </button>
            <button type="button" onClick={buyNow} className="btn btn-block">
              Buy Now
            </button>
            {cartError && (
              <p role="alert" className="text-xs text-sale">
                {cartError}
              </p>
            )}
          </div>

          {/* pincode */}
          <div className="mt-7 border-t border-line pt-6">
            <form onSubmit={handleSubmit(onPincode)} noValidate>
              <Field label="Delivery pincode" htmlFor="pincode" error={errors.pincode?.message} hint="Check delivery time and COD availability for your area.">
                <div className="flex gap-2">
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="110001"
                    autoComplete="postal-code"
                    {...register('pincode')}
                    className="input w-36"
                  />
                  <button type="submit" disabled={pinChecking} className="btn btn-outline !px-5">
                    {pinChecking ? 'Checking…' : 'Check'}
                  </button>
                </div>
              </Field>
            </form>
            {pinApiError && (
              <p role="alert" className="text-xs text-sale mt-2">
                {pinApiError}
              </p>
            )}
            {pinResult && (
              <div className="mt-3 text-sm bg-paper p-3">
                <p>
                  <span className="text-muted">Estimated (demo):</span> delivery in {pinResult.etaDays[0]}–
                  {pinResult.etaDays[1]} days
                </p>
                <p className="mt-1">{pinResult.cod ? 'COD available' : 'COD not available for this pincode'}</p>
              </div>
            )}
          </div>

          {/* shipping summary */}
          <div className="mt-6 bg-paper p-4 text-sm space-y-2.5">
            <h2 className="font-head text-xs uppercase tracking-widest">Shipping &amp; returns</h2>
            <p className="flex items-start gap-2">
              <Truck size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
              <span>Ships in 2–4 business days. ₹99 shipping below ₹750, free above.</span>
            </p>
            <p className="flex items-start gap-2">
              <RotateCcw size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
              <span>7-day easy exchange on unused items with tags intact.</span>
            </p>
          </div>
        </div>
      </div>

      {/* details */}
      <section className="mt-14 max-w-3xl" aria-label="Product details">
        <h2 className="text-xl mb-4">Details</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-ink/90">
          {descriptionParas.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        {attrRows.length > 0 && (
          <table className="w-full mt-6 text-sm border border-line">
            <tbody>
              {attrRows.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <th className="text-left font-head uppercase tracking-widest text-xs px-4 py-3 bg-paper w-44 align-top">
                    {row.label}
                  </th>
                  <td className="px-4 py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {related.length > 0 && <ProductCarousel title="You may also like" products={related} />}

      {/* recently viewed */}
      {recent.length > 0 && (
        <section className="py-10" aria-label="Recently viewed">
          <h2 className="text-xl mb-5">Recently viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {recent.map((r) => (
              <Link key={r.slug} to={`/products/${r.slug}`} className="group block">
                <div className="aspect-[3/4] bg-paper overflow-hidden">
                  {r.image && (
                    <img
                      src={r.image}
                      alt={r.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <p className="text-xs mt-2 leading-snug line-clamp-2 group-hover:text-gold">{r.name}</p>
                <div className="mt-1">
                  <Price paise={r.pricePaise} compareAtPaise={r.compareAtPaise} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
}
