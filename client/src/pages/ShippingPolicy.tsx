import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

export default function ShippingPolicy() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shipping policy' }]} />
      <SectionHead title="Shipping policy" subtitle="How and when your order reaches you." />

      <div className="mx-auto max-w-3xl space-y-8 pb-16 text-[15px] leading-relaxed">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Dispatch &amp; delivery time
          </h2>
          <p className="text-muted">
            Orders are packed and dispatched from our Jaipur studio within 2–4 business days.
            Delivery after dispatch usually takes 3–7 business days, depending on your location.
            Business days are Monday to Saturday; orders placed on Sunday or public holidays are
            processed the next business day.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Shipping charges
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Orders below ₹750: flat ₹99 shipping.</li>
            <li>Orders of ₹750 and above (after discounts): free shipping.</li>
            <li>There are no additional handling or COD charges.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Cash on Delivery
          </h2>
          <p className="text-muted">
            COD is available across India on every product. Please keep the exact order amount
            ready at the time of delivery, as our delivery partners may not carry change.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Pincode serviceability
          </h2>
          <p className="text-muted">
            We deliver to most pincodes in India. You can check whether we serve your pincode —
            and whether COD is available there — using the pincode checker on any product page
            before you order.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">Delays</h2>
          <p className="text-muted">
            Weather, strikes, festivals and other events outside our control can occasionally
            delay shipments. If your parcel is delayed beyond the expected window, write to{' '}
            <a
              href="mailto:care@rdcollection.in"
              className="underline hover:text-ink"
            >
              care@rdcollection.in
            </a>{' '}
            with your order number and we will trace it for you.
          </p>
        </section>
      </div>
    </div>
  );
}
