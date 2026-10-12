import { useState } from 'react';

interface AnnounceBarProps {
  messages?: string[];
}

const DEFAULT_MESSAGES = ['₹99 SHIPPING BELOW ₹750 · FREE SHIPPING FROM ₹750'];

export default function AnnounceBar({ messages = DEFAULT_MESSAGES }: AnnounceBarProps) {
  const [index, setIndex] = useState(0);
  const list = messages.length ? messages : DEFAULT_MESSAGES;
  if (list.length <= 1) {
    return (
      <div className="bg-ink text-white text-center text-[11px] tracking-[.18em] uppercase py-2 px-4">
        {list[0]}
      </div>
    );
  }
  return (
    <div className="bg-ink text-white text-center text-[11px] tracking-[.18em] uppercase py-2 px-12 relative">
      <span key={index}>{list[index]}</span>
      <button
        type="button"
        aria-label="Previous announcement"
        onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next announcement"
        onClick={() => setIndex((i) => (i + 1) % list.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
      >
        ›
      </button>
    </div>
  );
}
