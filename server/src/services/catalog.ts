/**
 * Shared product listing: Mongo coarse filters + in-memory variant-level
 * filters/sorting + pagination. Correct for catalogs up to tens of thousands
 * of products; move variant filtering into aggregation if the catalog grows.
 */
import { Product, publicProduct, type IProduct, type ProductView } from '../models/Product';
import { paginate, type Paginated } from '../utils/pagination';

export type ProductSort =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'name'
  | 'bestselling';

/** Accept both kebab-case (spec) and snake_case (client) sort values. */
export function normalizeSort(raw: string | undefined): ProductSort {
  const s = (raw ?? 'featured').toLowerCase().replace(/_/g, '-');
  if (s === 'price-asc' || s === 'price-desc' || s === 'newest' || s === 'name' || s === 'bestselling' || s === 'featured') {
    return s;
  }
  return 'featured';
}

export interface ProductListParams {
  category?: string;
  collection?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  fabric?: string;
  inStock?: boolean;
  status?: 'draft' | 'published' | 'archived';
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** Sanitize free-text search input (strip regex/meta chars, cap length). */
export function sanitizeSearch(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]\\^$.*+?()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export async function listProducts(params: ProductListParams): Promise<Paginated<ProductView>> {
  const mongoFilter: Record<string, unknown> = {
    status: params.status ?? 'published',
  };
  if (params.category) mongoFilter.category = params.category.toLowerCase();
  if (params.collection) mongoFilter.collections = params.collection.toLowerCase();

  const q = sanitizeSearch(params.q);
  if (q) {
    let docs: IProduct[];
    try {
      // Whole-word text search first; regex fallback for partial matches
      // or when the text index is still building.
      docs = await Product.find(
        { ...mongoFilter, $text: { $search: q } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .lean<IProduct[]>();
    } catch {
      docs = [];
    }
    if (!docs.length) {
      const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      docs = await Product.find({
        ...mongoFilter,
        $or: [
          { name: { $regex: rx, $options: 'i' } },
          { 'variants.sku': { $regex: rx, $options: 'i' } },
          { tags: { $regex: rx, $options: 'i' } },
        ],
      }).lean<IProduct[]>();
    }
    return finish(docs, params);
  }

  const docs = await Product.find(mongoFilter).lean<IProduct[]>();
  return finish(docs, params);
}

function finish(docs: IProduct[], params: ProductListParams): Paginated<ProductView> {
  const minPrice = params.minPrice;
  const maxPrice = params.maxPrice;
  const size = params.size?.toLowerCase();
  const color = params.color?.toLowerCase();
  const fabric = params.fabric?.toLowerCase();

  let views = docs.map(publicProduct);

  views = views.filter((p) => {
    const active = p.variants.filter((v) => v.active);
    if (!active.length) return false;
    const prices = active.map((v) => v.pricePaise);
    const lo = Math.min(...prices);
    if (minPrice !== undefined && lo < minPrice) return false;
    if (maxPrice !== undefined && lo > maxPrice) return false;
    if (size && !active.some((v) => v.size.toLowerCase() === size)) return false;
    if (color && !active.some((v) => v.color.toLowerCase() === color)) return false;
    if (fabric) {
      const f = (p.fabric ?? p.attributes['fabric'] ?? '').toLowerCase();
      if (!f.includes(fabric)) return false;
    }
    if (params.inStock && !active.some((v) => v.stock > 0)) return false;
    return true;
  });

  const sort = normalizeSort(params.sort);
  const priceOf = (p: ProductView) => p.pricePaise ?? Number.MAX_SAFE_INTEGER;
  switch (sort) {
    case 'price-asc':
      views.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case 'price-desc':
      views.sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case 'newest':
      views.sort((a, b) => +b.createdAt - +a.createdAt);
      break;
    case 'name':
      views.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'bestselling':
      views.sort((a, b) => b.soldCount - a.soldCount);
      break;
    case 'featured':
    default:
      views.sort(
        (a, b) =>
          b.soldCount - a.soldCount ||
          Number(b.isNew) - Number(a.isNew) ||
          +b.createdAt - +a.createdAt,
      );
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24));
  const total = views.length;
  const items = views.slice((page - 1) * pageSize, page * pageSize);
  return paginate(items, total, page, pageSize);
}
