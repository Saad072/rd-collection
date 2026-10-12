/** URL-safe slug from an arbitrary string. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Unique order number, e.g. RD-20261012-X7K9Q2. */
export function generateOrderNumber(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  // crypto is available in Node 24 globally; avoid Math.random for identifiers.
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) rand += alphabet[b % alphabet.length];
  return `RD-${y}${m}${d}-${rand}`;
}

/** Paise -> "₹1,499.00" style display string (presentation only). */
export function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
