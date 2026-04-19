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

function MarqueeContent() {
  return (
    <>
      {ITEMS.map((item, i) => (
        <span key={i} className="flex items-center gap-8 shrink-0">
          <span
            className={`text-2xl sm:text-3xl lg:text-4xl font-normal tracking-[-0.02em] whitespace-nowrap ${
              item.ghost ? 'text-gray-300' : 'text-gray-900'
            }`}
          >
            {item.text}
          </span>
          <span className="w-2 h-2 rounded-full bg-safety-orange shrink-0" />
        </span>
      ))}
    </>
  );
}

export default function MarqueeSection() {
  return (
    <section className="py-10 sm:py-14 border-y border-gray-200 overflow-hidden">
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="flex">
        <div className="marquee-track flex items-center gap-8 shrink-0">
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>
    </section>
  );
}
