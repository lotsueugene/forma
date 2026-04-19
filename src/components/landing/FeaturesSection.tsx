'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        });
      },
      { threshold: 0.15 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="features-section" id="features" ref={sectionRef}>
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div className="section-head">
          <div className="section-head-left">
            <div className="eyebrow"><span className="dot-pulse" />Features</div>
            <h2>Everything you<br/>need to capture<br/>data<span className="orange-dot">.</span></h2>
          </div>
          <p className="section-head-meta">
            From simple contact forms to complex multi-step workflows. Build, deploy,
            and scale with confidence.
          </p>
        </div>

        <div className="features-grid">
          {/* 01 — Highlight tall */}
          <div className="feature-card feature-highlight feature-tall">
            <div>
              <div className="fe-num">01</div>
              <div className="spark-big">$0</div>
              <h3>Unlimited submissions,<br/>every plan.</h3>
              <p>No per-submission pricing. No surprises. Scale from 100 to 100,000 responses without changing your bill.</p>
            </div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>

          {/* 02 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">02</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <h3>Drag &amp; drop builder</h3>
              <p>17+ field types, conditional logic, multi-step flows, branching.</p>
            </div>
          </div>

          {/* 03 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">03</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              </div>
              <h3>Take payments</h3>
              <p>Stripe Connect. Money lands in your bank, not ours.</p>
            </div>
          </div>

          {/* 04 — Wide */}
          <div className="feature-card feature-wide">
            <div>
              <div className="fe-num">04</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>
              </div>
              <h3>Analytics that answer questions</h3>
              <p>Conversion rates, funnel drop-offs, peak hours, geo. Revenue per form. All out of the box.</p>
            </div>
          </div>

          {/* 05 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">05</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <h3>Realtime webhooks</h3>
              <p>Retry logic, HMAC signatures. Slack, Notion, anywhere.</p>
            </div>
          </div>

          {/* 06 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">06</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3>Custom domains</h3>
              <p>Serve forms on your domain. SSL handled. White-label included.</p>
            </div>
          </div>

          {/* 07 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">07</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3>Security, handled</h3>
              <p>reCAPTCHA, honeypot, rate limits, encryption. GDPR-ready.</p>
            </div>
          </div>

          {/* 08 */}
          <div className="feature-card">
            <div>
              <div className="fe-num">08</div>
              <div className="fe-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M9 15h6"/></svg>
              </div>
              <h3>AI-generated forms</h3>
              <p>Describe it in a sentence. Get a working form. Powered by Claude.</p>
            </div>
          </div>

          {/* 09 — Wide highlight */}
          <div className="feature-card feature-wide feature-highlight" style={{ minHeight: 'auto' }}>
            <div>
              <div className="fe-num">09</div>
              <h3 style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 0 }}>
                Ten more features where those came from<span style={{ color: 'var(--orange)' }}>.</span>
              </h3>
            </div>
            <a
              href="/features"
              style={{
                fontFamily: 'var(--font-mono, "Geist Mono", ui-monospace, monospace)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--orange)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
                zIndex: 2,
                cursor: 'pointer',
              }}
            >
              See the full list
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
