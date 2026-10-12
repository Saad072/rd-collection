import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Terms of service' }]} />
      <SectionHead title="Terms of service" subtitle="The fine print, in plain language." />

      <div className="mx-auto max-w-3xl space-y-8 pb-16 text-[15px] leading-relaxed">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Pricing &amp; promotions
          </h2>
          <p className="text-muted">
            All prices are in Indian Rupees (₹) and inclusive of GST. Site-wide promotions — ₹200
            off on orders of ₹1,999 and above, ₹350 off on orders of ₹2,999 and above — apply
            automatically and cannot be combined with coupon codes unless stated otherwise. We may
            correct pricing errors before dispatch; if an error affects your order, we will
            contact you before shipping.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Orders &amp; availability
          </h2>
          <p className="text-muted">
            Placing an order is an offer to buy; the contract is formed when we confirm and
            dispatch your order. If an item becomes unavailable after you order, we will cancel
            that item and refund you in full. We reserve the right to cancel orders in cases of
            suspected fraud, bulk-buying for resale, or delivery-address issues.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">Payments</h2>
          <p className="text-muted">
            You may pay online via UPI, cards or net banking through our payment partner, or
            choose Cash on Delivery. For COD orders, payment is due in full at the time of
            delivery. Failed or pending online payments are never treated as confirmed orders —
            please re-order rather than paying twice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Shipping &amp; exchanges
          </h2>
          <p className="text-muted">
            Delivery timelines and charges are described in our shipping policy; exchanges within
            7 days of delivery are described in our returns policy. Both form part of these
            terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Intellectual property
          </h2>
          <p className="text-muted">
            All product photography, descriptions, designs and branding on this store belong to
            RD Collection. You may not copy, reproduce or use them commercially without written
            permission.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Liability
          </h2>
          <p className="text-muted">
            Our liability for any order is limited to the amount you paid for that order. We are
            not liable for delays caused by events outside our control, or for minor colour
            variation between product photos and garments, which is normal for natural fabrics.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Governing law
          </h2>
          <p className="text-muted">
            These terms are governed by the laws of India. Any disputes will be subject to the
            jurisdiction of the courts in Jaipur, Rajasthan.
          </p>
        </section>
      </div>
    </div>
  );
}
