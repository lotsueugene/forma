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
        {/* Header: logo mark + wordmark. SVG is inlined (not loaded from disk
            or via URL) so the build never hits the network — Satori renders
            it directly. Same paths as public/icon.svg / forma-mark.svg. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 256 256" fill="#ef6f2e" xmlns="http://www.w3.org/2000/svg">
            <path d="M220,169.09l-92,53.65L36,169.09A8,8,0,0,0,28,182.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,169.09Z" />
            <path d="M220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09Z" />
            <path d="M28,86.91l96,56a8,8,0,0,0,8.06,0l96-56a8,8,0,0,0,0-13.82l-96-56a8,8,0,0,0-8.06,0l-96,56a8,8,0,0,0,0,13.82Z" />
          </svg>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
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
