/**
 * Email service.
 * Current: log adapter (prints formatted emails to the console).
 * The Mailer interface is provider-ready — swap `mailer` for an SMTP/API
 * implementation without touching call sites.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(msg: EmailMessage): Promise<void>;
}

class LogMailer implements Mailer {
  async send(msg: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(
      `[email] To: ${msg.to}\n[email] Subject: ${msg.subject}\n[email] ----\n${msg.text}\n[email] ----`,
    );
  }
}

export const mailer: Mailer = new LogMailer();

export async function sendOrderConfirmation(opts: {
  to: string;
  name: string;
  orderNumber: string;
  totalPaise: number;
  paymentMethod: string;
}): Promise<void> {
  const total = '₹' + (opts.totalPaise / 100).toLocaleString('en-IN');
  await mailer.send({
    to: opts.to,
    subject: `RD_COLLECTION — order ${opts.orderNumber} confirmed`,
    text:
      `Hi ${opts.name},\n\n` +
      `Thank you for shopping with RD_COLLECTION!\n` +
      `Order: ${opts.orderNumber}\n` +
      `Total: ${total} (${opts.paymentMethod === 'cod' ? 'Cash on Delivery' : 'paid online'})\n\n` +
      `We will notify you when your order ships.\n\n` +
      `— Team RD_COLLECTION`,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await mailer.send({
    to,
    subject: 'Welcome to RD_COLLECTION',
    text: `Hi ${name},\n\nYour RD_COLLECTION account is ready. Happy shopping!\n\n— Team RD_COLLECTION`,
  });
}
