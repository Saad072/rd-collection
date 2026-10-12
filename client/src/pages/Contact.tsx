import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Breadcrumbs } from './_local/ui';
import { zodResolver } from './_local/rhf';
import { Field } from '../components/forms/Field';
import { SectionHead } from '../components/product/ProductCarousel';

const SUPPORT_EMAIL = 'care@rdcollection.in';

const schema = z.object({
  name: z.string().min(2, 'Please tell us your name'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  message: z.string().min(10, 'Please write at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function Contact() {
  const [sent, setSent] = useState<{ name: string; mailto: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (v: FormValues) => {
    const subject = v.subject?.trim() || `Website enquiry from ${v.name}`;
    const body = [
      `Name: ${v.name}`,
      `Email: ${v.email}`,
      v.phone?.trim() ? `Phone: ${v.phone.trim()}` : null,
      '',
      v.message,
    ]
      .filter((l): l is string => l !== null)
      .join('\n');
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent({ name: v.name, mailto });
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <SectionHead title="Contact us" subtitle="Questions about an order, size or fabric? We reply within 24 hours on business days." />

      <div className="mx-auto grid max-w-4xl gap-8 pb-14 md:grid-cols-[1fr_320px]">
        <div>
          {sent ? (
            <div className="border border-line p-6" role="status">
              <h3 className="mb-2 text-lg">Thanks {sent.name}!</h3>
              <p className="mb-5 text-sm text-muted">
                Your message is ready — click below to send it via your email app.
              </p>
              <a href={sent.mailto} className="btn">
                Open email app
              </a>
              <button
                type="button"
                onClick={() => setSent(null)}
                className="btn btn-outline ml-3"
              >
                Write another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field label="Your name" htmlFor="name" required error={errors.name?.message}>
                <input id="name" className="input" autoComplete="name" {...register('name')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="email" required error={errors.email?.message}>
                  <input id="email" type="email" className="input" autoComplete="email" {...register('email')} />
                </Field>
                <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
                  <input id="phone" type="tel" className="input" autoComplete="tel" {...register('phone')} />
                </Field>
              </div>
              <Field label="Subject (optional)" htmlFor="subject" error={errors.subject?.message}>
                <input id="subject" className="input" {...register('subject')} />
              </Field>
              <Field
                label="Message"
                htmlFor="message"
                required
                error={errors.message?.message}
                hint="Include your order number if this is about an order."
              >
                <textarea id="message" className="input min-h-[140px]" {...register('message')} />
              </Field>
              <button type="submit" className="btn">
                Prepare email
              </button>
            </form>
          )}
        </div>

        <aside className="h-fit border border-line bg-paper p-6" aria-label="Contact information">
          <h3 className="mb-4 text-[15px] font-semibold uppercase tracking-widest">Reach us</h3>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block font-medium">Email</span>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-muted hover:text-ink hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block font-medium">Phone / WhatsApp</span>
                <span className="text-muted">+91-98290-00000</span>
                <span className="block text-xs text-muted">Mon–Sat, 10am–7pm IST</span>
              </span>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block font-medium">Studio</span>
                <span className="text-muted">Jaipur, Rajasthan, India</span>
              </span>
            </li>
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            For exchange requests, please keep your order number and the tags on the garment handy —
            it helps us arrange a pickup faster.
          </p>
        </aside>
      </div>
    </div>
  );
}
