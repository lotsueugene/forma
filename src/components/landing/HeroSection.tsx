'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const PROMPTS = [
  'Create a contact form with validation\u2026',
  'Build a survey with conditional logic\u2026',
  'Design a registration form with file upload\u2026',
  'Set up webhook integration with Slack\u2026',
];

const CHIPS = ['Lead capture', 'Event RSVP', 'Payment flow', 'Booking page'];


export default function HeroSection() {
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [progressWidth, setProgressWidth] = useState(25);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing animation
  useEffect(() => {
    let pi = 0;
    let ci = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    function typeLoop() {
      const s = PROMPTS[pi];
      if (!deleting) {
        ci++;
        if (ci > s.length) {
          deleting = true;
          timeout = setTimeout(typeLoop, 2200);
          return;
        }
      } else {
        ci--;
        if (ci <= 0) {
          deleting = false;
          pi = (pi + 1) % PROMPTS.length;
        }
      }
      setPlaceholder(s.slice(0, ci) + (deleting ? '' : '|'));
      timeout = setTimeout(typeLoop, deleting ? 20 : 55);
    }
    typeLoop();
    return () => clearTimeout(timeout);
  }, []);

  // Keyboard handler for A/B/C/D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined) {
        setSelectedOption(idx);
        setProgressWidth(25 + idx * 2);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleChipClick = useCallback((chip: string) => {
    if (inputRef.current) {
      inputRef.current.value = chip + ' form';
      inputRef.current.focus();
    }
  }, []);

  return (
    <section className="hero-section" id="hero">
      <a
        href="https://github.com/lotsueugene/forma"
        target="_blank"
        rel="noopener noreferrer"
        className="oss-badge"
      >
        <span className="oss-badge-pulse" aria-hidden="true" />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-.99-.02-1.94-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.17 0 .3.21.67.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
        </svg>
        <span className="oss-badge-label">Proudly open source</span>
        <span className="oss-badge-sep" aria-hidden="true">·</span>
        <span className="oss-badge-cta">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Star on GitHub
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </a>

      <div className="hero-inner">
        <div>

          <h1 className="hero-headline">
            {/* Screen-reader/SEO prefix: gives Google and assistive tech the
                keyword-rich context before the artistic visual headline. The
                visible lines below stay unchanged. */}
            <span className="sr-only">
              Forma — the modern open-source form builder.{' '}
            </span>
            <span className="line"><span className="inner">Forms that</span></span>
            <span className="line"><span className="inner">feel like a</span></span>
            <span className="line"><span className="inner">conversation<span className="orange-dot">.</span></span></span>
          </h1>

          <p className="hero-lede">
            The modern way to build, launch, and automate forms. Collect submissions,
            take payments, and wire it all into your stack — without the bloat.
          </p>

          <div className="prompt-widget" role="group" aria-label="Describe your form">
            <div className="prompt-tabs">
              <span className="prompt-tab active">Dashboard</span>
              <span className="prompt-tab">API / CLI</span>
              <div className="prompt-dots"><span /><span /><span /></div>
            </div>
            <div className="prompt-body">
              <label className="prompt-input-row">
                <span className="prompt-caret">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  autoComplete="off"
                />
                <button className="prompt-go" aria-label="Generate">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </label>
              <div className="prompt-suggestions">
                {CHIPS.map((chip) => (
                  <button key={chip} className="chip" onClick={() => handleChipClick(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-ctas">
            <Link href="/signup" className="btn-landing btn-primary-landing btn-lg-landing">
              Start building free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <span className="hero-sub">No credit card · 3 forms free</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-form">
            <div className="ff-topbar">
              <div className="ff-q-num"><b>01</b><span className="sep">/</span><span>04</span></div>
              <div className="ff-keyhint">
                <kbd>A</kbd><kbd>B</kbd><kbd>C</kbd><kbd>D</kbd>
                <span>to pick</span>
              </div>
            </div>
            <div className="ff-question">
              What should we build you<span className="spark">?</span>
            </div>
            <div className="ff-options">
              {['Lead capture form', 'Event signup with payment', 'Booking with availability', 'Multi-step survey'].map((opt, idx) => (
                <div
                  key={idx}
                  className={`ff-option ${selectedOption === idx ? 'selected' : ''}`}
                  onClick={() => { setSelectedOption(idx); setProgressWidth(25 + idx * 2); }}
                >
                  <span className="ff-letter">{['A','B','C','D'][idx]}</span>
                  {opt}
                  <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                </div>
              ))}
            </div>
            <div className="ff-footer">
              <div className="ff-progress">
                <div className="ff-progress-bar" style={{ width: `${progressWidth}%` }} />
              </div>
              <a href="/signup" className="ff-next" aria-label="Next">
                Get started
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-cue">
        <div className="scroll-mouse">
          <div className="scroll-wheel" />
        </div>
        <span className="scroll-label">Scroll</span>
      </div>
    </section>
  );
}
