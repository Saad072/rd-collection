import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

export default function ReturnsPolicy() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Returns & exchange' }]} />
      <SectionHead title="Returns & exchange" subtitle="7-day easy exchange on every order." />

      <div className="mx-auto max-w-3xl space-y-8 pb-16 text-[15px] leading-relaxed">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            7-day exchange promise
          </h2>
          <p className="text-muted">
            If the size, colour or fit isn&apos;t right, you can exchange your garment within 7
            days of delivery — for a different size, a different colour, or another product of
            equal value. Exchanges are free: we arrange the pickup and ship the replacement at no
            extra cost to you.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            When refunds apply
          </h2>
          <p className="text-muted">
            We issue refunds — not exchanges — when you receive a damaged, defective or wrong
            item. Please share a photo of the issue within 7 days of delivery so we can approve
            your case quickly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Exchange conditions
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Garments must be unworn and unwashed.</li>
            <li>All tags must be attached, with the original packaging.</li>
            <li>Please try garments on carefully before removing tags.</li>
            <li>Items marked final sale at the time of purchase cannot be exchanged.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            How to raise an exchange
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>
              Write to{' '}
              <a href="mailto:care@rdcollection.in" className="underline hover:text-ink">
                care@rdcollection.in
              </a>{' '}
              within 7 days of delivery with your order number.
            </li>
            <li>Tell us what you would like instead — size, colour or a different product.</li>
            <li>We arrange a doorstep pickup of the original item.</li>
            <li>Your replacement ships as soon as the original reaches our studio.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Refund timelines
          </h2>
          <p className="text-muted">
            Approved refunds are processed within 5–7 business days: online payments go back to
            the original payment source, and COD orders are refunded via UPI or bank transfer.
            Bank processing may add 2–3 business days before the amount reflects in your account.
          </p>
        </section>
      </div>
    </div>
  );
}
