import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const GROUPS: FaqGroup[] = [
  {
    title: 'Orders & payment',
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse the store, pick your size and colour, and add items to your bag. At checkout, enter your delivery address and choose Cash on Delivery or online payment. You will get an order confirmation on screen and by email.',
      },
      {
        q: 'Do you offer Cash on Delivery (COD)?',
        a: 'Yes. COD is available on every order across India. Please keep the exact amount ready — our delivery partners may not carry change.',
      },
      {
        q: 'Which online payment methods do you accept?',
        a: 'UPI, debit and credit cards, and net banking, processed securely through Razorpay. We never see or store your card details.',
      },
      {
        q: 'Can I change or cancel my order after placing it?',
        a: 'You can cancel or edit your order free of charge while it is still in "Confirmed" status — usually within a few hours of ordering. Once it moves to "Processing", write to care@rdcollection.in and we will do our best to help.',
      },
    ],
  },
  {
    title: 'Shipping',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Orders are dispatched within 2–4 business days from Jaipur. Delivery usually takes 3–7 business days after dispatch, depending on your pincode. You can check serviceability for your pincode on any product page.',
      },
      {
        q: 'What are the shipping charges?',
        a: 'Shipping is a flat ₹99 for orders below ₹750, and free for orders of ₹750 and above (after discounts). There are no hidden charges at checkout.',
      },
      {
        q: 'My tracking has not updated. What should I do?',
        a: 'Tracking can take 24–48 hours to appear after dispatch. If there is no update after 3 business days, write to care@rdcollection.in with your order number and we will trace the parcel.',
      },
    ],
  },
  {
    title: 'Returns & exchange',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 7-day easy exchange from the date of delivery. If the size or colour does not work for you, we will exchange it for another size or a different product of equal value. Refunds are issued only for damaged, defective or wrong items.',
      },
      {
        q: 'What condition should the garment be in for an exchange?',
        a: 'Unworn, unwashed, with all tags attached and in the original packaging. Please try garments on carefully before removing tags.',
      },
      {
        q: 'How do I raise an exchange request?',
        a: 'Write to care@rdcollection.in within 7 days of delivery with your order number and what you would like instead. We will arrange a doorstep pickup and ship the replacement once the original item reaches us.',
      },
      {
        q: 'How long do refunds take?',
        a: 'For damaged, defective or wrong items, refunds are processed to the original payment source within 5–7 business days of approval. COD orders are refunded via UPI or bank transfer.',
      },
    ],
  },
  {
    title: 'Product & size',
    items: [
      {
        q: 'How do I choose the right size?',
        a: 'Every product page has a size guide with body measurements in inches. Our fits run true to the chart from XS to 6XL — when in doubt between two sizes, we suggest sizing up for kurtis and relaxed sets.',
      },
      {
        q: 'Are the colours exactly as shown in photos?',
        a: 'We photograph in natural light and show the closest true colour, but screens vary. Slight variation between the photo and the garment is normal with natural fabrics and dyes.',
      },
      {
        q: 'How should I wash and care for my garments?',
        a: 'Machine wash cold with like colours, dry in shade, and warm-iron if needed. Detailed care instructions are printed on the wash-care label inside each garment.',
      },
    ],
  },
];

function FaqEntry({ item, id }: { item: FaqItem; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-button`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[15px] font-medium">{item.q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} hidden={!open}>
        <p className="pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]} />
      <SectionHead
        title="Frequently asked questions"
        subtitle="Everything about orders, shipping, exchanges and sizing."
      />

      <div className="mx-auto max-w-3xl space-y-10 pb-8">
        {GROUPS.map((group, gi) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
              {group.title}
            </h2>
            <div className="border-t border-line">
              {group.items.map((item, ii) => (
                <FaqEntry key={item.q} item={item} id={`faq-${gi}-${ii}`} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="pb-16 text-center text-sm text-muted">
        Still stuck?{' '}
        <Link to="/contact" className="underline hover:text-ink">
          Contact us
        </Link>{' '}
        — we reply within 24 hours on business days.
      </p>
    </div>
  );
}
