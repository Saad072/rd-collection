import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import type { Product } from '../../types';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 40);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.search(q);
        setResults(res.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, open]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) go(`/products/${results[activeIndex].slug}`);
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/98" role="dialog" aria-modal="true" aria-label="Search">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute top-5 right-5 p-2 hover:text-gold"
      >
        <X size={24} strokeWidth={1.8} />
      </button>
      <div className="max-w-[640px] mx-auto px-5 pt-24">
        <div className="flex border border-ink">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search kurtas, sarees, sets..."
            aria-label="Search products"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `sugg-${activeIndex}` : undefined}
            className="flex-1 min-w-0 px-4 py-4 text-base outline-none"
          />
          <button
            type="button"
            aria-label="Submit search"
            onClick={() => query.trim() && go(`/search?q=${encodeURIComponent(query.trim())}`)}
            className="px-5 bg-ink text-white"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-2 border border-line divide-y divide-line" role="listbox" id="search-suggestions">
          {loading && <p className="px-4 py-3 text-sm text-muted">Searching...</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">No matches — press Enter to see all results.</p>
          )}
          {results.map((p, i) => {
            const v = p.variants[0];
            return (
              <button
                key={p._id}
                id={`sugg-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                type="button"
                onClick={() => go(`/products/${p.slug}`)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                  i === activeIndex ? 'bg-paper' : ''
                }`}
              >
                <img
                  src={p.images[0]?.url}
                  alt=""
                  className="w-10 h-[54px] object-cover flex-shrink-0 bg-paper"
                  loading="lazy"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{p.name}</span>
                  <span className="block text-xs text-muted">
                    {v ? formatINR(v.pricePaise) : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {query.trim().length >= 2 && (
          <Link
            to={`/search?q=${encodeURIComponent(query.trim())}`}
            onClick={onClose}
            className="link-arrow mt-4"
          >
            View all results
          </Link>
        )}
      </div>
    </div>
  );
}
