import { Breadcrumbs } from './_local/ui';
import { SectionHead } from '../components/product/ProductCarousel';

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Privacy policy' }]} />
      <SectionHead title="Privacy policy" subtitle="How we collect, use and protect your data." />

      <div className="mx-auto max-w-3xl space-y-8 pb-16 text-[15px] leading-relaxed">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Data we collect
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Account details you provide: name, email address and phone number.</li>
            <li>Delivery addresses you save for your orders.</li>
            <li>Order history, wishlist items and support conversations.</li>
            <li>Basic device and browsing data (pages viewed, items added to bag) to keep the store working.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            How we use it
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>To process, ship and support your orders, including COD verification calls or messages.</li>
            <li>To operate your account, bag and wishlist across devices.</li>
            <li>To send order updates and, only if you opt in, offers and new-arrival emails.</li>
            <li>To improve the store — for example, understanding which sizes sell out fastest.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">Cookies</h2>
          <p className="text-muted">
            We use essential cookies to keep you signed in and remember your bag. With your
            consent, we may use analytics cookies to understand store traffic. You can clear or
            block cookies in your browser settings; the store will still work, but your bag may
            not persist between visits.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">
            Sharing your data
          </h2>
          <p className="text-muted">
            We share data only where needed to run the store: our payment partner (Razorpay) to
            process online payments, and our logistics partners to deliver your parcel. We never
            sell your personal data, and we do not share it for third-party marketing.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">Your rights</h2>
          <p className="text-muted">
            You can view and update your account details and addresses at any time from your
            account page. To request a copy of your data, correct it, or ask us to delete your
            account, write to{' '}
            <a href="mailto:care@rdcollection.in" className="underline hover:text-ink">
              care@rdcollection.in
            </a>{' '}
            — we will act within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-widest">Contact</h2>
          <p className="text-muted">
            For any privacy question, reach us at{' '}
            <a href="mailto:care@rdcollection.in" className="underline hover:text-ink">
              care@rdcollection.in
            </a>
            , RD Collection, Jaipur, Rajasthan, India.
          </p>
        </section>
      </div>
    </div>
  );
}
