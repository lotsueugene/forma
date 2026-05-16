import { ImageResponse } from 'next/og';

// Programmatic OG card. Generated at build time and cached, so cost is paid
// once per deploy. No font file needed — system fallback renders fine for the
// short text. To add real typography, drop a .ttf into /assets and load via
// readFile + ImageResponse.fonts.
export const runtime = 'edge';
export const alt = 'Forma — the modern open-source form builder';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fff7f1 100%)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#ef6f2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0a0a0a' }}>Forma</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#0a0a0a',
            }}
          >
            Forms that feel like a conversation
            <span style={{ color: '#ef6f2e' }}>.</span>
          </div>
          <div style={{ fontSize: 28, color: '#525252', lineHeight: 1.4, maxWidth: 900 }}>
            Open-source form builder. Drag-and-drop, payments, integrations,
            analytics — all in one.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, color: '#737373' }}>withforma.io</div>
          <div
            style={{
              fontSize: 18,
              padding: '10px 18px',
              border: '1px solid #e5e5e5',
              borderRadius: 999,
              color: '#0a0a0a',
              background: '#ffffff',
            }}
          >
            ★ Open source on GitHub
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
