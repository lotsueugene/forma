'use client';

export default function GridOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    >
      {/* Grid lines */}
      <div className="absolute inset-0 grid-overlay opacity-50" />

      {/* Gradient fade at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background: 'linear-gradient(to top, var(--dark-base-primary) 0%, transparent 100%)'
        }}
      />

      {/* Subtle radial gradient in center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
