import { Minus, Plus } from 'lucide-react';

interface QtyStepperProps {
  qty: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
  label?: string;
}

export default function QtyStepper({ qty, min = 1, max = 99, onChange, label = 'Quantity' }: QtyStepperProps) {
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={qty <= min}
        onClick={() => onChange(qty - 1)}
        className="w-[30px] h-[30px] flex items-center justify-center disabled:opacity-40 hover:bg-paper"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[28px] text-center text-[13px] font-medium" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
        className="w-[30px] h-[30px] flex items-center justify-center disabled:opacity-40 hover:bg-paper"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
