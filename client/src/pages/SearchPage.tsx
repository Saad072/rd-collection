import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Category, Product } from '../types';
import { api, ApiError } from '../services/api';
import { Field } from '../components/forms/Field';
import { Breadcrumbs } from './_local/ui';
import ProductCard from '../components/product/ProductCard';
import EmptyState from '../components/feedback/EmptyState';
import ErrorState from '../components/feedback/ErrorState';
import { ProductGridSkeleton } from '../components/feedback/ProductCardSkeleton';

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (term: string) => void }) {
  const [term, setTerm] = useState(initial);

  useEffect(() => {
    setTerm(initial);
  }, [initial]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(term.trim());
      }}
      className="max-w-xl mx-auto"
    >
      <Field label="Search products" htmlFor="search-input">
        <div className="flex gap-2">
          <input
            id="search-input"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Kurtas, fabrics, colours…"
            className="input flex-1"
          />
          <button type="submit" className="btn">
            Search
          </button>
        </div>
      </Field>
    </form>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = (searchParams.get('q') ?? '').trim();

  const [results, setResults] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    if (!q) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .search(q)
      .then((res) => {
        if (!cancelled) setResults(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setResults(null);
          setError(e instanceof ApiError ? e.message : 'Search failed. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, reload]);

  /* Fetch popular categories only when a search returns nothing. */
  useEffect(() => {
    if (results && results.length === 0 && categories === null) {
      api
        .getCategories()
        .then((cats) => setCategories(cats.filter((c) => c.active)))
        .catch(() => setCategories([]));
    }
  }, [results, categories]);

  const runSearch = (term: string) => {
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Search' }]} />

      {!q && (
        <div className="pt-4">
          <EmptyState
            title="Search the collection"
            message="Type a style, fabric or colour above to find your next favourite."
          />
          <SearchForm initial="" onSearch={runSearch} />
        </div>
      )}

      {q && (
        <>
          <div className="pt-2 pb-8">
            <SearchForm initial={q} onSearch={runSearch} />
          </div>

          {loading && <ProductGridSkeleton count={8} />}

          {!loading && error && <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />}

          {!loading && !error && results && results.length > 0 && (
            <>
              <h1 className="text-[clamp(20px,3vw,28px)] text-center mb-8">
                {results.length} {results.length === 1 ? 'result' : 'results'} for &lsquo;{q}&rsquo;
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4">
                {results.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            </>
          )}

          {!loading && !error && results && results.length === 0 && (
            <>
              <EmptyState
                title={`No results for '${q}'`}
                message="Check your spelling, try a shorter word, or browse a category below."
              />
              {categories && categories.length > 0 && (
                <div className="mt-2">
                  <h2 className="text-center text-sm uppercase tracking-widest text-muted mb-4">
                    Popular categories
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {categories.slice(0, 10).map((c) => (
                      <Link
                        key={c.slug}
                        to={`/collections/${c.slug}`}
                        className="text-sm border border-line px-4 py-2 hover:border-ink"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
