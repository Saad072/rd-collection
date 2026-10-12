import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { Paginated, Product } from '../../types';
import { Pagination, toast } from '../_local/ui';
import { priceRange, resolveImage, totalStock } from '../_local/ui';
import ErrorState from '../../components/feedback/ErrorState';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_TONE: Record<string, string> = {
  published: 'bg-green-50 text-green-800',
  draft: 'bg-gold/15 text-[#8a6d1f]',
  archived: 'bg-paper text-muted',
};

export default function AdminProducts() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.products.list({
        q: debouncedQ || undefined,
        status: status || undefined,
        page,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (p: Product) => {
    const next = p.status === 'published' ? 'draft' : 'published';
    try {
      await api.admin.products.update(p._id, { status: next });
      toast(next === 'published' ? 'Product published' : 'Product moved to draft');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.admin.products.remove(p._id);
      toast('Product deleted');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Products</h1>
        <Link to="/admin/products/new" className="btn">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New product
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name..."
          aria-label="Search products"
          className="input max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="input max-w-[200px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error || !data ? (
        <ErrorState message={error || 'Failed to load products'} onRetry={() => void load()} />
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No products found. Create your first product to get started.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 pr-4 font-medium">Stock</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const { price } = priceRange(p);
                  return (
                    <tr key={p._id} className="border-b border-line">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImage(p.images[0]?.url)}
                            alt=""
                            className="h-11 w-11 shrink-0 border border-line object-cover"
                          />
                          <div>
                            <p className="font-medium">
                              {p.name}{' '}
                              {p.isNew && (
                                <span className="ml-1 inline-block h-2 w-2 rounded-full bg-sale" title="New arrival" />
                              )}
                            </p>
                            <p className="text-xs text-muted">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{formatINR(price)}</td>
                      <td className="py-3 pr-4 text-muted">{totalStock(p)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${STATUS_TONE[p.status] ?? 'bg-paper text-ink'}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-3 text-[13px]">
                          <button
                            type="button"
                            onClick={() => void toggleStatus(p)}
                            className="hover:underline"
                          >
                            {p.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <Link to={`/admin/products/${p._id}`} className="hover:underline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => void remove(p)}
                            className="text-sale hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
