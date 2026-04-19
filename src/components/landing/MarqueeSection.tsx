'use client';

const ITEMS = [
  { text: 'Drag & drop', ghost: false },
  { text: 'Payments', ghost: true },
  { text: 'Bookings', ghost: false },
  { text: 'Webhooks', ghost: true },
  { text: 'AI-generated forms', ghost: false },
  { text: 'Custom domains', ghost: true },
  { text: 'Analytics', ghost: false },
  { text: 'Integrations', ghost: true },
];

export default function MarqueeSection() {
  // Duplicate items for seamless loop
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="marquee-wrap">
      <div className="marquee-row">
        {doubled.map((item, idx) => (
          <span
            key={idx}
            className={`marquee-item ${item.ghost ? 'ghost' : ''}`}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
