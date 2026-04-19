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
      <div className="hero-inner">
        <div>

          <h1 className="hero-headline">
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
