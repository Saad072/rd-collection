/**
 * Pincode serviceability.
 * Dev adapter: validates the 6-digit format and returns a clearly-marked
 * estimated response. Replace with a logistics API lookup when available —
 * never present these estimates as guaranteed.
 */

export interface PincodeResult {
  serviceable: boolean;
  cod: boolean;
  etaDays: [number, number];
  /** human-readable eta, e.g. "4–7 days" */
  eta: string;
  note: string;
}

export function isValidPincode(code: string): boolean {
  return /^[1-9][0-9]{5}$/.test(code);
}

export function checkPincode(code: string): PincodeResult {
  const normalized = code.trim();
  if (!isValidPincode(normalized)) {
    return {
      serviceable: false,
      cod: false,
      etaDays: [0, 0],
      eta: '—',
      note: 'Please enter a valid 6-digit pincode.',
    };
  }
  return {
    serviceable: true,
    cod: true,
    etaDays: [4, 7],
    eta: '4–7 days',
    note: 'Estimated (demo) — connect a logistics provider for live serviceability.',
  };
}
