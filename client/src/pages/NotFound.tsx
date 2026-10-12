import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../components/forms/Field';

const HELPFUL_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'New Arrivals', to: '/collections/new-arrivals' },
  { label: 'Sale', to: '/collections/sale' },
  { label: 'Contact', to: '/contact' },
  { label: 'FAQ', to: '/faq' },
];

export default function NotFound() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  return (
    <div className="max-w-[720px] mx-auto px-4 py-16 md:py-24 text-center">
      <p className="font-head text-[clamp(72px,14vw,140px)] leading-none" aria-hidden>
        404
      </p>
      <h1 className="text-[clamp(22px,4vw,32px)] mt-4">Page not found</h1>
      <p className="text-muted text-sm mt-3 max-w-md mx-auto">
        The page you&rsquo;re looking for may have moved, or the link may be incomplete. Try a quick
        search below, or head somewhere familiar.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = term.trim();
          navigate(t ? `/search?q=${encodeURIComponent(t)}` : '/search');
        }}
        className="mt-8 text-left"
      >
        <Field label="Search the store" htmlFor="notfound-search">
          <div className="flex gap-2">
            <input
              id="notfound-search"
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

      <nav aria-label="Helpful links" className="mt-10">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {HELPFUL_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="link-arrow text-sm">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
