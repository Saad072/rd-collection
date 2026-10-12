import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Category, Product } from '../types';
import { api, ApiError } from '../services/api';
import { formatINR } from '../lib/pricing';
import { Breadcrumbs, Drawer, Pagination, priceRange, totalStock } from './_local/ui';
import { Field } from '../components/forms/Field';
import ProductCard from '../components/product/ProductCard';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import { ProductGridSkeleton } from '../components/feedback/ProductCardSkeleton';

const PAGE_SIZE = 24;

const SORTS = ['featured', 'price_asc', 'price_desc', 'newest', 'name', 'best_selling'] as const;
type SortKey = (typeof SORTS)[number];

const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  newest: 'Newest',
  name: 'Name: A–Z',
  best_selling: 'Best Selling',
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

interface Filters {
  cats: string[];
  colors: string[];
  sizes: string[];
  fabrics: string[];
  minRupees: string;
  maxRupees: string;
  inStock: boolean;
  sort: SortKey;
  page: number;
}

interface CollectionData {
  title: string;
  description?: string;
  products: Product[];
}

function prettySlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function splitParam(value: string | null): string[] {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function parseSort(value: string | null): SortKey {
  return (SORTS as readonly string[]).includes(value ?? '') ? (value as SortKey) : 'featured';
}

function parsePage(value: string | null): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Rupees input string -> paise, or undefined when blank/invalid. */
function parseRupees(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    cats: splitParam(params.get('cats')),
    colors: splitParam(params.get('colors')),
    sizes: splitParam(params.get('sizes')),
    fabrics: splitParam(params.get('fabrics')),
    minRupees: params.get('minPrice') ?? '',
    maxRupees: params.get('maxPrice') ?? '',
    inStock: params.get('inStock') === '1',
    sort: parseSort(params.get('sort')),
    page: parsePage(params.get('page')),
  };
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    const ra = ia === -1 ? SIZE_ORDER.length : ia;
    const rb = ib === -1 ? SIZE_ORDER.length : ib;
    return ra === rb ? a.localeCompare(b) : ra - rb;
  });
}

/* ---------------- filter panel (shared by sidebar + mobile drawer) ---------------- */

interface CheckOption {
  value: string;
  label: string;
  count?: number;
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: CheckOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="font-head text-xs uppercase tracking-widest mb-3">{title}</legend>
      <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <li key={opt.value}>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="h-4 w-4 accent-[#1C1C1C]"
                />
                <span className={checked ? 'font-medium' : 'text-ink/80'}>
                  {opt.label}
                  {opt.count !== undefined && (
                    <span className="text-muted text-xs"> ({opt.count})</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function FiltersPanel(props: {
  facets: {
    cats: [string, number][];
    colors: string[];
    sizes: string[];
    fabrics: string[];
    minPaise: number;
    maxPaise: number;
  };
  filters: Filters;
  catLabel: (slug: string) => string;
  onPatch: (patch: Partial<Filters>) => void;
  onToggle: (key: 'cats' | 'colors' | 'sizes' | 'fabrics', value: string) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const { facets, filters, catLabel, onPatch, onToggle, onClear, activeCount } = props;
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          {activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? '' : 's'} active` : 'No filters applied'}
        </span>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="link-arrow text-[13px]">
            Clear all
          </button>
        )}
      </div>

      <CheckGroup
        title="Category"
        options={facets.cats.map(([slug, count]) => ({ value: slug, label: catLabel(slug), count }))}
        selected={filters.cats}
        onToggle={(v) => onToggle('cats', v)}
      />

      <div>
        <p className="font-head text-xs uppercase tracking-widest mb-3">Price</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Min (₹)" htmlFor="price-min">
              <input
                id="price-min"
                type="number"
                min={0}
                inputMode="decimal"
                value={filters.minRupees}
                onChange={(e) => onPatch({ minRupees: e.target.value })}
                placeholder={facets.minPaise > 0 ? String(Math.floor(facets.minPaise / 100)) : '0'}
                className="input w-full"
              />
            </Field>
          </div>
          <span className="pb-2.5 text-muted" aria-hidden>
            –
          </span>
          <div className="flex-1">
            <Field label="Max (₹)" htmlFor="price-max">
              <input
                id="price-max"
                type="number"
                min={0}
                inputMode="decimal"
                value={filters.maxRupees}
                onChange={(e) => onPatch({ maxRupees: e.target.value })}
                placeholder={facets.maxPaise > 0 ? String(Math.ceil(facets.maxPaise / 100)) : ''}
                className="input w-full"
              />
            </Field>
          </div>
        </div>
      </div>

      <CheckGroup
        title="Colour"
        options={facets.colors.map((c) => ({ value: c, label: c }))}
        selected={filters.colors}
        onToggle={(v) => onToggle('colors', v)}
      />

      <CheckGroup
        title="Size"
        options={facets.sizes.map((s) => ({ value: s, label: s }))}
        selected={filters.sizes}
        onToggle={(v) => onToggle('sizes', v)}
      />

      <CheckGroup
        title="Fabric"
        options={facets.fabrics.map((f) => ({ value: f, label: f }))}
        selected={filters.fabrics}
        onToggle={(v) => onToggle('fabrics', v)}
      />

      <Field label="In stock only" htmlFor="filter-instock">
        <input
          id="filter-instock"
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => onPatch({ inStock: e.target.checked })}
          className="h-4 w-4 accent-[#1C1C1C]"
        />
      </Field>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function CollectionPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<CollectionData | null>(null);
  const [catNames, setCatNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  /* Reset to page 1 when the collection slug changes (keep other filters). */
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const [colRes, cats] = await Promise.all([
          api.getCollection(slug, { pageSize: 500 }),
          api.getCategories().catch(() => [] as Category[]),
        ]);
        if (cancelled) return;
        setCatNames(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
        setData({
          title: colRes.collection.name,
          description: colRes.collection.description,
          products: colRes.products.items,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          /* Fallback: treat the slug as a category. */
          try {
            const cats = await api.getCategories();
            const cat = cats.find((c) => c.slug === slug);
            if (!cat) {
              throw new ApiError('NOT_FOUND', 'We could not find this collection.', 404);
            }
            const res = await api.getProducts({ category: slug, pageSize: 500 });
            if (cancelled) return;
            setCatNames(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
            setData({
              title: cat.name,
              description: cat.description,
              products: res.items,
            });
          } catch (e2) {
            if (!cancelled) {
              setError(e2 instanceof ApiError ? e2.message : 'Failed to load this collection. Please try again.');
            }
          }
        } else if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load this collection. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, reload]);

  const catLabel = (catSlug: string): string => catNames[catSlug] ?? prettySlug(catSlug);

  const facets = useMemo(() => {
    const products = data?.products ?? [];
    const catCounts = new Map<string, number>();
    const colors = new Set<string>();
    const sizes = new Set<string>();
    const fabrics = new Set<string>();
    let minPaise = Infinity;
    let maxPaise = 0;
    let hasSold = false;
    for (const p of products) {
      catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
      for (const v of p.variants) {
        if (!v.active) continue;
        if (v.color) colors.add(v.color);
        if (v.size) sizes.add(v.size);
      }
      const fabric = p.fabric || p.attributes['Fabric'];
      if (fabric) fabrics.add(fabric);
      const pr = priceRange(p);
      if (pr.price > 0) {
        minPaise = Math.min(minPaise, pr.price);
        maxPaise = Math.max(maxPaise, pr.price);
      }
      if (p.soldCount > 0) hasSold = true;
    }
    return {
      cats: [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      colors: [...colors].sort((a, b) => a.localeCompare(b)),
      sizes: sortSizes([...sizes]),
      fabrics: [...fabrics].sort((a, b) => a.localeCompare(b)),
      minPaise: minPaise === Infinity ? 0 : minPaise,
      maxPaise,
      hasSold,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const products = data?.products ?? [];
    const minPaise = parseRupees(filters.minRupees);
    const maxPaise = parseRupees(filters.maxRupees);
    const list = products.filter((p) => {
      if (filters.cats.length > 0 && !filters.cats.includes(p.category)) return false;
      if (
        filters.colors.length > 0 &&
        !p.variants.some((v) => v.active && filters.colors.includes(v.color))
      )
        return false;
      if (
        filters.sizes.length > 0 &&
        !p.variants.some((v) => v.active && filters.sizes.includes(v.size))
      )
        return false;
      if (filters.fabrics.length > 0) {
        const fabric = p.fabric || p.attributes['Fabric'];
        if (!fabric || !filters.fabrics.includes(fabric)) return false;
      }
      if (filters.inStock && totalStock(p) <= 0) return false;
      const pr = priceRange(p);
      if (minPaise !== undefined && pr.price < minPaise) return false;
      if (maxPaise !== undefined && pr.price > maxPaise) return false;
      return true;
    });
    switch (filters.sort) {
      case 'price_asc':
        return [...list].sort((a, b) => priceRange(a).price - priceRange(b).price);
      case 'price_desc':
        return [...list].sort((a, b) => priceRange(b).price - priceRange(a).price);
      case 'newest':
        return [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case 'best_selling':
        return [...list].sort((a, b) => b.soldCount - a.soldCount);
      case 'featured':
      default:
        return list;
    }
  }, [data, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ---- URL sync ---- */

  const writeParams = (f: Filters) => {
    const next = new URLSearchParams();
    if (f.cats.length > 0) next.set('cats', f.cats.join(','));
    if (f.colors.length > 0) next.set('colors', f.colors.join(','));
    if (f.sizes.length > 0) next.set('sizes', f.sizes.join(','));
    if (f.fabrics.length > 0) next.set('fabrics', f.fabrics.join(','));
    if (f.minRupees.trim()) next.set('minPrice', f.minRupees.trim());
    if (f.maxRupees.trim()) next.set('maxPrice', f.maxRupees.trim());
    if (f.inStock) next.set('inStock', '1');
    if (f.sort !== 'featured') next.set('sort', f.sort);
    if (f.page > 1) next.set('page', String(f.page));
    setSearchParams(next);
  };

  /** Changing filters resets pagination to page 1. */
  const patchFilters = (patch: Partial<Filters>) => {
    writeParams({ ...filters, ...patch, page: 1 });
  };

  const toggleValue = (key: 'cats' | 'colors' | 'sizes' | 'fabrics', value: string) => {
    const current = filters[key];
    patchFilters({
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    } as Partial<Filters>);
  };

  const changePage = (p: number) => {
    writeParams({ ...filters, page: p });
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---- active filter chips ---- */

  interface Chip {
    key: string;
    label: string;
    remove: () => void;
  }

  const chips: Chip[] = [];
  for (const c of filters.cats) {
    chips.push({ key: `cat-${c}`, label: catLabel(c), remove: () => toggleValue('cats', c) });
  }
  for (const c of filters.colors) {
    chips.push({ key: `color-${c}`, label: c, remove: () => toggleValue('colors', c) });
  }
  for (const s of filters.sizes) {
    chips.push({ key: `size-${s}`, label: `Size ${s}`, remove: () => toggleValue('sizes', s) });
  }
  for (const f of filters.fabrics) {
    chips.push({ key: `fabric-${f}`, label: f, remove: () => toggleValue('fabrics', f) });
  }
  if (filters.minRupees.trim() || filters.maxRupees.trim()) {
    const min = parseRupees(filters.minRupees);
    const max = parseRupees(filters.maxRupees);
    const label =
      min !== undefined && max !== undefined
        ? `${formatINR(min)} – ${formatINR(max)}`
        : min !== undefined
          ? `Over ${formatINR(min)}`
          : `Under ${formatINR(max ?? 0)}`;
    chips.push({
      key: 'price',
      label,
      remove: () => patchFilters({ minRupees: '', maxRupees: '' }),
    });
  }
  if (filters.inStock) {
    chips.push({ key: 'instock', label: 'In stock', remove: () => patchFilters({ inStock: false }) });
  }
  if (filters.sort !== 'featured') {
    chips.push({
      key: 'sort',
      label: `Sort: ${SORT_LABELS[filters.sort]}`,
      remove: () => patchFilters({ sort: 'featured' }),
    });
  }
  const activeCount = chips.length;

  const clearAll = () =>
    writeParams({ cats: [], colors: [], sizes: [], fabrics: [], minRupees: '', maxRupees: '', inStock: false, sort: 'featured', page: 1 });

  const sortOptions: SortKey[] = facets.hasSold ? [...SORTS] : SORTS.filter((s) => s !== 'best_selling');

  return (
    <div className="max-w-[1240px] mx-auto px-4 pb-16">
      {data && (
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collections', to: '/collections' }, { label: data.title }]} />
      )}

      {/* header */}
      <div className="text-center pt-2 pb-8 px-4">
        {loading ? (
          <div className="animate-pulse" aria-hidden>
            <div className="h-8 bg-paper w-64 mx-auto mb-3" />
            <div className="h-4 bg-paper w-96 max-w-full mx-auto" />
          </div>
        ) : (
          data && (
            <>
              <h1 className="text-[clamp(24px,4vw,36px)]">{data.title}</h1>
              {data.description && <p className="text-muted text-sm mt-3 max-w-2xl mx-auto">{data.description}</p>}
              <p className="text-[13px] text-muted mt-3 tracking-wide">
                {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              </p>
            </>
          )
        )}
      </div>

      {loading && <ProductGridSkeleton count={8} />}

      {!loading && error && <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />}

      {!loading && !error && data && (
        <div className="flex gap-8 items-start">
          {/* desktop sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-8">
            <FiltersPanel
              facets={facets}
              filters={filters}
              catLabel={catLabel}
              onPatch={patchFilters}
              onToggle={toggleValue}
              onClear={clearAll}
              activeCount={activeCount}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {/* toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden btn btn-outline !px-4 !py-2 text-sm flex items-center gap-2"
              >
                <SlidersHorizontal size={16} aria-hidden /> Filters
                {activeCount > 0 && (
                  <span className="bg-ink text-white text-[11px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>
              <div className="lg:hidden" aria-hidden />
              <div className="w-48">
                <Field label="Sort by" htmlFor="sort-select">
                  <select
                    id="sort-select"
                    value={filters.sort}
                    onChange={(e) => patchFilters({ sort: e.target.value as SortKey })}
                    className="input w-full"
                  >
                    {sortOptions.map((s) => (
                      <option key={s} value={s}>
                        {SORT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* active chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5" aria-label="Active filters">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.remove}
                    className="flex items-center gap-1.5 text-xs border border-line px-2.5 py-1.5 hover:border-ink"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label}
                    <X size={13} aria-hidden />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="link-arrow text-xs">
                  Clear all
                </button>
              </div>
            )}

            {/* grid */}
            <div ref={gridRef} className="scroll-mt-24">
              {pageItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4">
                  {pageItems.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              ) : (
                <div>
                  <EmptyState
                    title="No products match your filters"
                    message="Try removing a filter or two — new pieces land here every week."
                  />
                  <div className="text-center">
                    <button type="button" onClick={clearAll} className="btn btn-outline">
                      Clear all filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={changePage} />
          </div>
        </div>
      )}

      {/* mobile filter drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" side="left">
        <div className="p-5">
          <FiltersPanel
            facets={facets}
            filters={filters}
            catLabel={catLabel}
            onPatch={patchFilters}
            onToggle={toggleValue}
            onClear={clearAll}
            activeCount={activeCount}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="btn btn-block mt-8"
          >
            Show {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
