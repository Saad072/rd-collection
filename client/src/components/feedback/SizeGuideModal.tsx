import { useEffect } from 'react';
import { X } from 'lucide-react';

/** Standard women's body measurements. Values are indicative guides, not garment-specific. */
const ROWS: [string, string, string, string][] = [
  ['XS', '80', '31.5', '60 / 23.5'],
  ['S', '84', '33', '64 / 25'],
  ['M', '88', '34.5', '68 / 26.75'],
  ['L', '94', '37', '74 / 29'],
  ['XL', '100', '39.5', '80 / 31.5'],
  ['2XL', '106', '41.75', '86 / 33.75'],
  ['3XL', '112', '44', '92 / 36.25'],
  ['4XL', '118', '46.5', '98 / 38.5'],
  ['5XL', '124', '48.75', '104 / 41'],
  ['6XL', '130', '51', '110 / 43.25'],
];

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ open, onClose }: SizeGuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-white">
          <h2 className="text-base">Size Guide</h2>
          <button type="button" aria-label="Close size guide" onClick={onClose} className="p-2 -mr-2">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted mb-4">
            Body measurements in centimetres and inches. Measure around the fullest part of your bust
            and the narrowest part of your waist, keeping the tape snug but not tight.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-line">
              <thead>
                <tr className="bg-paper">
                  <th className="text-left font-head uppercase tracking-widest text-xs px-4 py-3 border-b border-line">Size</th>
                  <th className="text-left font-head uppercase tracking-widest text-xs px-4 py-3 border-b border-line">Bust (cm/in)</th>
                  <th className="text-left font-head uppercase tracking-widest text-xs px-4 py-3 border-b border-line">Waist (cm/in)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([size, bust, bustIn, waist]) => (
                  <tr key={size} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{size}</td>
                    <td className="px-4 py-2.5">{bust} / {bustIn}</td>
                    <td className="px-4 py-2.5">{waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-4">
            Fit varies by style and fabric. If you are between sizes, we recommend the larger size for
            relaxed kurtas and the smaller size for fitted styles.
          </p>
        </div>
      </div>
    </div>
  );
}
