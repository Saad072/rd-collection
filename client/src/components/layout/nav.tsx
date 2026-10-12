import { Link } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
  children?: { label: string; to: string }[];
}

/** Department navigation with optional subcategories (mega-menu). */
export const NAV_ITEMS: NavItem[] = [
  { label: 'New Arrivals', to: '/collections/new-arrivals' },
  { label: 'Workwear', to: '/collections/workwear' },
  { label: 'Ethnic Sets', to: '/collections/ethnic-sets' },
  { label: 'Kurta & Kurti', to: '/collections/kurta-kurti' },
  { label: 'Sarees', to: '/collections/sarees' },
  { label: 'Dress Material', to: '/collections/dress-material' },
  {
    label: 'Fusion Wear',
    to: '/collections/fusion-wear',
    children: [
      { label: 'Co-Ord Sets', to: '/collections/fusion-wear' },
      { label: 'Tops & Tunics', to: '/collections/fusion-wear' },
      { label: 'Shirts', to: '/collections/fusion-wear' },
      { label: 'Dresses', to: '/collections/fusion-wear' },
      { label: 'Jackets', to: '/collections/fusion-wear' },
      { label: 'Loungewear', to: '/collections/fusion-wear' },
    ],
  },
  { label: 'Bottom Wear', to: '/collections/bottom-wear' },
  { label: 'Sale', to: '/collections/sale' },
];

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted mb-4">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-ink underline-offset-2 hover:underline">
            Home
          </Link>
        </li>
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {t.to && i < trail.length - 1 ? (
              <Link to={t.to} className="hover:text-ink underline-offset-2 hover:underline">
                {t.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
