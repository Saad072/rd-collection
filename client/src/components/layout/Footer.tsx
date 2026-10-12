import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { api } from '../../services/api';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

export default function Footer() {
  const [status, setStatus] = useState<Status>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setStatus('loading');
    try {
      const res = await api.newsletter(values.email);
      setStatus(res.duplicate ? 'duplicate' : 'success');
      reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer className="bg-paper border-t border-line mt-16">
      <div className="max-w-[1240px] mx-auto px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-head font-bold text-xl uppercase tracking-wide2 mb-3">RD_COLLECTION</p>
          <p className="text-sm text-muted leading-relaxed max-w-sm">
            Everyday ethnic wear designed for real Indian wardrobes — kurta sets, sarees, workwear and
            fusion styles in sizes XS to 6XL, made in India.
          </p>
          <div className="mt-6">
            <p className="label">Get new-arrival updates</p>
            <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-sm" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Your email"
                {...register('email')}
                className="input !border-r-0"
                aria-invalid={!!errors.email}
                disabled={status === 'loading'}
              />
              <button type="submit" className="btn !px-5 whitespace-nowrap" disabled={status === 'loading'}>
                {status === 'loading' ? 'Joining...' : 'Join'}
              </button>
            </form>
            {errors.email && <p className="text-sale text-xs mt-2">{errors.email.message}</p>}
            {status === 'success' && (
              <p className="text-xs mt-2 text-green-700">Thank you — you are on the list.</p>
            )}
            {status === 'duplicate' && (
              <p className="text-xs mt-2 text-muted">This email is already subscribed.</p>
            )}
            {status === 'error' && (
              <p className="text-xs mt-2 text-sale">Something went wrong. Please try again.</p>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <a href="#" aria-label="Instagram" className="p-2 border border-line hover:border-ink">
              <Instagram size={18} strokeWidth={1.8} />
            </a>
            <a href="#" aria-label="Facebook" className="p-2 border border-line hover:border-ink">
              <Facebook size={18} strokeWidth={1.8} />
            </a>
            <a href="#" aria-label="YouTube" className="p-2 border border-line hover:border-ink">
              <Youtube size={18} strokeWidth={1.8} />
            </a>
          </div>
        </div>

        <nav aria-label="Discover">
          <p className="font-head font-semibold text-sm uppercase tracking-widest mb-4">Discover</p>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link to="/collections/new-arrivals" className="hover:text-ink">New Arrivals</Link></li>
            <li><Link to="/collections/kurta-kurti" className="hover:text-ink">Kurta &amp; Kurti</Link></li>
            <li><Link to="/collections/sarees" className="hover:text-ink">Sarees</Link></li>
            <li><Link to="/collections/ethnic-sets" className="hover:text-ink">Ethnic Sets</Link></li>
            <li><Link to="/collections/sale" className="hover:text-ink">Sale</Link></li>
          </ul>
        </nav>

        <nav aria-label="Customer service">
          <p className="font-head font-semibold text-sm uppercase tracking-widest mb-4">Customer Service</p>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link to="/contact" className="hover:text-ink">Contact Us</Link></li>
            <li><Link to="/faq" className="hover:text-ink">FAQs</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-ink">Shipping Policy</Link></li>
            <li><Link to="/returns-policy" className="hover:text-ink">Returns &amp; Exchange</Link></li>
            <li><Link to="/account/orders" className="hover:text-ink">Track Order</Link></li>
          </ul>
        </nav>

        <nav aria-label="Policies">
          <p className="font-head font-semibold text-sm uppercase tracking-widest mb-4">Information</p>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link to="/about" className="hover:text-ink">About Us</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-ink">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-ink">Terms &amp; Conditions</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="max-w-[1240px] mx-auto px-4 py-5 flex flex-col sm:flex-row gap-2 items-center justify-between text-xs text-muted">
          <p>© {new Date().getFullYear()} RD_COLLECTION · Made in India</p>
          <p>Cash on Delivery available across India</p>
        </div>
      </div>
    </footer>
  );
}
