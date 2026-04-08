'use client';

export default function GridOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    >
      {/* Grid lines */}
      <div className="absolute inset-0 grid-overlay opacity-50" />

      {/* Subtle radial gradient in center - matches brand orange */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239, 111, 46, 0.04) 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
