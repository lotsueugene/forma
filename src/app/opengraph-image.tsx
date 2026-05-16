import { ImageResponse } from 'next/og';

// Programmatic OG card. Default Node.js runtime — Edge runtime is a Vercel
// specialty and doesn't work on a self-hosted PM2/Node deploy. With the Node
// runtime this is statically generated at build time and served as a cached
// file, which is what we want anyway.
//
// Satori rules to keep in mind when editing:
//   - Every <div> with more than one child node MUST set `display: 'flex'`.
//   - Stick to plain ASCII text — fancy glyphs (★, em-dashes inside short
//     spans, etc.) trigger dynamic font lookups that fail offline.
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
        {/* Header: logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#ef6f2e',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#0a0a0a' }}>
            Forma
          </div>
        </div>

        {/* Headline + subhead */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#0a0a0a',
            }}
          >
            Forms that feel like a conversation.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#525252',
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Open-source form builder. Drag-and-drop, payments, integrations,
            analytics. All in one.
          </div>
        </div>

        {/* Footer: domain + open-source pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 22, color: '#737373' }}>withforma.io</div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              padding: '10px 18px',
              border: '1px solid #e5e5e5',
              borderRadius: 999,
              color: '#0a0a0a',
              background: '#ffffff',
              fontWeight: 600,
            }}
          >
            Open source on GitHub
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
