import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';
import '../landing.css';

export const metadata = {
  title: 'Features | Forma',
  description: 'Everything Forma offers — form builder, payments, bookings, automations, analytics, and more.',
};

const features = [
  {
    category: 'Form Builder',
    items: [
      { name: 'Drag & Drop Builder', desc: '19 field types with reordering, conditional logic, and multi-page forms.' },
      { name: 'Conversational Mode', desc: 'Typeform-style one-question-at-a-time experience with keyboard navigation.' },
      { name: 'AI Form Generation', desc: 'Describe what you need in a sentence and get a working form instantly.' },
      { name: 'API Endpoints', desc: 'POST any JSON data — no predefined fields required. Perfect for developers.' },
      { name: 'Conditional Logic', desc: 'Show or hide fields based on previous answers. Build smart, dynamic forms.' },
      { name: 'File Uploads', desc: 'Accept images, PDFs, and documents. Stored securely on Amazon S3.' },
      { name: 'Rating Fields', desc: 'Star ratings for feedback and surveys.' },
      { name: 'Terms & Conditions', desc: 'Scrollable legal text with clickable links and required agreement checkbox.' },
      { name: 'Payment Fields', desc: 'Collect one-time payments via Stripe directly in your forms.' },
      { name: 'Booking Fields', desc: 'Calendar with availability rules, time slots, and scheduling.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { name: 'Stripe Connect', desc: 'Money goes directly to your Stripe account. Not ours.' },
      { name: 'Conditional Pricing', desc: 'Show different amounts based on form answers.' },
      { name: 'One-Time Payments', desc: 'Charge per submission with Stripe Checkout.' },
      { name: 'Platform Fees', desc: 'Configurable platform fee percentage for marketplace models.' },
    ],
  },
  {
    category: 'Bookings',
    items: [
      { name: 'Shareable Booking Links', desc: 'Public booking pages anyone can access without logging in.' },
      { name: 'Weekly Availability', desc: 'Set available hours per day with multiple time blocks.' },
      { name: 'Time-Off & Blocked Dates', desc: 'Block specific dates so no one can book them.' },
      { name: 'Custom & Fixed Slots', desc: 'Let users pick their own time or choose from predefined slots.' },
      { name: 'Overnight Slots', desc: 'Support for time ranges that span midnight (e.g. 9 PM to 1 AM).' },
    ],
  },
  {
    category: 'Automations & Email',
    items: [
      { name: 'Auto-Reply Emails', desc: 'Send a confirmation email immediately when someone submits.' },
      { name: 'Follow-Up Sequences', desc: 'Schedule delayed emails — hours or days after submission.' },
      { name: 'Template Variables', desc: 'Personalize emails with {{name}}, {{email}}, and any form field.' },
      { name: 'Rich Text Editor', desc: 'WYSIWYG email editor with bold, italic, links, and lists.' },
      { name: 'Broadcast Emails', desc: 'Send marketing emails to all respondents of a form.' },
      { name: 'Email Log', desc: 'Track every email sent — status, recipient, timestamp.' },
    ],
  },
  {
    category: 'Analytics',
    items: [
      { name: 'Submission Trends', desc: 'Daily submission charts over 7, 30, or 90 day periods.' },
      { name: 'Conversion Rates', desc: 'Views vs submissions per form with percentage.' },
      { name: 'Drop-Off Analysis', desc: 'See which fields users abandon the form at.' },
      { name: 'Peak Hours', desc: 'Hourly distribution of submissions to find the best times.' },
      { name: 'Top Forms', desc: 'Ranked by submissions with conversion rates.' },
      { name: 'Growth Metrics', desc: 'Period-over-period comparison to track momentum.' },
    ],
  },
  {
    category: 'Integrations',
    items: [
      { name: 'Webhooks', desc: 'Send submission data to any URL with HMAC signatures and retry logic.' },
      { name: 'Slack', desc: 'Get notified in Slack when someone submits a form.' },
      { name: 'Google Sheets', desc: 'Automatically add submissions as rows in a spreadsheet.' },
      { name: 'Custom Domains', desc: 'Serve forms from your own domain with automatic SSL.' },
      { name: 'Embeddable', desc: 'Embed forms on any website via iframe.' },
      { name: 'API Keys', desc: 'Programmatic access to your forms and submissions.' },
    ],
  },
  {
    category: 'Team & Workspace',
    items: [
      { name: 'Role-Based Access', desc: 'Owner, Manager, Editor, Viewer — each with specific permissions.' },
      { name: 'Team Invitations', desc: 'Invite members by email with role assignment.' },
      { name: 'Multiple Workspaces', desc: 'Separate projects, clients, or teams into their own spaces.' },
      { name: 'Ownership Transfer', desc: 'Hand off workspace ownership to another team member.' },
    ],
  },
  {
    category: 'Branding & Design',
    items: [
      { name: 'Custom Colors', desc: 'Set accent, background, and text colors per form.' },
      { name: 'Workspace Logo', desc: 'Your logo in broadcast emails and branding.' },
      { name: 'Thank You Pages', desc: 'Custom heading, message, and redirect URL after submission.' },
      { name: 'Social Previews', desc: 'Set OG title, description, and image for shared form links.' },
    ],
  },
  {
    category: 'Security',
    items: [
      { name: 'reCAPTCHA', desc: 'Spam protection on form submissions.' },
      { name: 'Rate Limiting', desc: 'Prevent abuse on all API endpoints.' },
      { name: 'SSRF Protection', desc: 'Webhook URLs validated against private IPs and metadata endpoints.' },
      { name: 'Input Validation', desc: 'Zod schemas on all API inputs.' },
      { name: 'Content Security Policy', desc: 'CSP, COOP, COEP headers on all pages.' },
      { name: 'SVG Sanitization', desc: 'Scripts and event handlers stripped from uploaded SVGs.' },
      { name: 'Audit Log', desc: 'Every login, password change, and sensitive action logged.' },
    ],
  },
];

let counter = 0;

export default function FeaturesPage() {
  counter = 0;

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 4vw, 40px)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--ink)', textDecoration: 'none' }}>
          <Stack size={22} weight="fill" />
          Forma
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/login" className="btn-landing btn-ghost-landing">Sign in</Link>
          <Link href="/signup" className="btn-landing btn-primary-landing">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: 'clamp(80px, 12vw, 120px) clamp(16px, 4vw, 40px) 80px', background: 'var(--paper-warm)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            <span className="dot-pulse" />
            <span>{features.reduce((sum, s) => sum + s.items.length, 0)} features</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(48px, 7vw, 96px)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            color: 'var(--ink)',
            marginBottom: 24,
          }}>
            Everything in<br/>Forma<span style={{ color: 'var(--orange)' }}>.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            textTransform: 'uppercase' as const,
            letterSpacing: '-0.015em',
            color: 'var(--ink-3)',
            maxWidth: 520,
            lineHeight: 1.5,
          }}>
            From simple contact forms to complex multi-step workflows with payments, bookings, and automations.
          </p>
        </div>
      </section>

      {/* Feature sections */}
      {features.map((section) => {
        const isEven = features.indexOf(section) % 2 === 0;
        return (
          <section
            key={section.category}
            style={{
              padding: '80px clamp(16px, 4vw, 40px)',
              background: isEven ? 'var(--paper)' : 'var(--paper-warm)',
            }}
          >
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: 'var(--faint)',
                marginBottom: 40,
                paddingBottom: 16,
                borderBottom: '1px solid var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>{section.category}</span>
                <span>{section.items.length} features</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
                gap: 0,
                borderTop: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '1px solid rgba(0,0,0,0.08)',
              }}>
                {section.items.map((item) => {
                  counter++;
                  const num = String(counter).padStart(2, '0');
                  return (
                    <div
                      key={item.name}
                      className="feature-list-item"
                      style={{
                        padding: '32px 28px',
                        borderRight: '1px solid rgba(0,0,0,0.08)',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--faint)',
                        letterSpacing: '0.04em',
                      }}>
                        {num}
                      </span>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                        color: 'var(--ink)',
                      }}>
                        {item.name}
                      </h3>
                      <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: 'var(--ink-3)',
                        lineHeight: 1.5,
                      }}>
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="final-cta-section" style={{ padding: '120px clamp(16px, 4vw, 40px)', textAlign: 'center' }}>
        <h2 style={{
          position: 'relative',
          fontSize: 'clamp(48px, 8vw, 120px)',
          fontWeight: 400,
          lineHeight: 0.95,
          letterSpacing: '-0.05em',
          color: '#fff',
          marginBottom: 32,
        }}>
          Start building<span style={{ color: '#0a0a0a' }}>.</span>
        </h2>
        <p style={{
          position: 'relative',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: 40,
        }}>
          Free to start. No credit card required.
        </p>
        <Link
          href="/signup"
          className="btn-landing btn-lg-landing"
          style={{
            position: 'relative',
            background: '#fff',
            color: 'var(--orange)',
            borderRadius: 4,
          }}
        >
          Get started free
        </Link>
      </section>
    </div>
  );
}
