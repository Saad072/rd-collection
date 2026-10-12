import { Link } from 'react-router-dom';
import { Leaf, MapPin, Ruler, Tag } from 'lucide-react';
import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

const VALUES = [
  {
    icon: Tag,
    title: 'Honest pricing',
    text: 'No inflated MRPs, no fake 70% off. One fair price, and site-wide promos that apply automatically at checkout.',
  },
  {
    icon: Ruler,
    title: 'Real sizes',
    text: 'Every kurti and set is graded from XS to 6XL on real body measurements, with a size guide on every product page.',
  },
  {
    icon: Leaf,
    title: 'Natural fabrics',
    text: 'Breathable cottons, soft rayons and easy-care blends that survive daily wear and regular washing.',
  },
  {
    icon: MapPin,
    title: 'Made in India',
    text: 'Designed and stitched in Jaipur, Rajasthan. Your order supports local tailoring units and artisan clusters.',
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <SectionHead
        title="Our story"
        subtitle="Everyday ethnic wear, designed in Jaipur, priced honestly."
      />

      <div className="mx-auto max-w-3xl space-y-5 pb-12 text-[15px] leading-relaxed">
        <p>
          RD Collection began in Jaipur in 2024 with a simple frustration: ethnic wear in India was
          either beautiful but unaffordable, or affordable but cut for nobody in particular. We
          wanted the third option — kurtis, co-ord sets and festive pieces that fit real bodies,
          use fabrics you can actually live in, and carry price tags that don&apos;t need a sale to
          make sense.
        </p>
        <p>
          We started with twelve silhouettes and one tailoring unit. Every design is sampled,
          washed, worn and re-graded before it reaches you. Sizes run XS to 6XL because our
          customers do. Prices stay honest because a kurti shouldn&apos;t cost a week&apos;s salary
          to feel special.
        </p>
        <p>
          Cash on delivery is available on every order, shipping is a flat ₹99 below ₹750 and free
          above it, and every purchase carries a 7-day exchange promise. If a garment doesn&apos;t
          work for you, we make it right — that&apos;s the whole business model.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-4 pb-12 sm:grid-cols-2">
        {VALUES.map((v) => (
          <div key={v.title} className="border border-line p-6">
            <v.icon className="mb-3 h-6 w-6" aria-hidden />
            <h3 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">{v.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{v.text}</p>
          </div>
        ))}
      </div>

      <div className="pb-16 text-center">
        <Link to="/collections/new-arrivals" className="btn">
          Shop new arrivals
        </Link>
      </div>
    </div>
  );
}
