'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const LEVELS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

interface CompetitorData {
  name: string;
  logo: string;
  tiers: [number, number][];
}

const COMPETITORS: Record<string, CompetitorData> = {
  typeform: {
    name: 'Typeform',
    logo: '/assets/logos/typeform.svg',
    tiers: [[0, 29], [1000, 59], [10000, 99], [50000, 499]],
  },
  jotform: {
    name: 'Jotform',
    logo: '/assets/logos/jotform.svg',
    tiers: [[0, 0], [100, 39], [1000, 49], [10000, 129]],
  },
  tally: {
    name: 'Tally',
    logo: '/assets/logos/tally.svg',
    tiers: [[0, 0], [50000, 29]],
  },
};

function getPrice(tiers: [number, number][], submissions: number): number {
  let price = tiers[0][1];
  for (const [thr, p] of tiers) {
    if (submissions >= thr) price = p;
  }
  return price;
}

export default function ComparisonSection() {
  const [sliderValue, setSliderValue] = useState(2);
  const [currentKey, setCurrentKey] = useState('typeform');
  const sectionRef = useRef<HTMLElement>(null);

  const submissions = LEVELS[sliderValue];
  const competitor = COMPETITORS[currentKey];
  const competitorPrice = getPrice(competitor.tiers, submissions);
  const sliderPercent = (sliderValue / (LEVELS.length - 1)) * 100;
  const sliderBg = `linear-gradient(to right, var(--orange) ${sliderPercent}%, #e5e7eb ${sliderPercent}%)`;

  // Scroll reveal
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

  const handleSwitcher = useCallback((key: string) => {
    setCurrentKey(key);
  }, []);

  return (
    <section className="compare-section" id="compare" ref={sectionRef}>
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div className="compare-head reveal">
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            <span className="dot-pulse" />Comparison
          </div>
          <h2>Forma vs {competitor.name}<span className="orange-dot">.</span></h2>
          <div className="compare-switcher">
            {Object.entries(COMPETITORS).map(([key, c]) => (
              <button
                key={key}
                className={`cs-btn ${currentKey === key ? 'active' : ''}`}
                onClick={() => handleSwitcher(key)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt="" />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="compare-card reveal">
          <div className="compare-slider">
            <div className="label">Expected submissions / month</div>
            <div className="value">{submissions.toLocaleString()}</div>
            <input
              className="compare-slider-input"
              type="range"
              min={0}
              max={LEVELS.length - 1}
              value={sliderValue}
              onChange={(e) => setSliderValue(parseInt(e.target.value))}
              style={{ background: sliderBg }}
            />
          </div>

          <div className="compare-prices">
            <div className="cp-card forma">
              <div className="name">Forma</div>
              <div className="price"><sup>$</sup>0</div>
              <div className="per">Always free at this tier</div>
            </div>
            <div className="vs-divider">vs</div>
            <div className="cp-card">
              <div className="name">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={competitor.logo} alt="" />
              </div>
              <div className="price"><sup>$</sup>{competitorPrice}</div>
              <div className="per">per month</div>
            </div>
          </div>

          <p className="savings-text">
            You save <b>{competitorPrice > 0 ? `$${competitorPrice} / mo` : 'same ($0)'}</b> — that&apos;s <b>{competitorPrice > 0 ? `$${(competitorPrice * 12).toLocaleString()} a year` : '$0 a year'}</b> you keep.
          </p>
        </div>
      </div>
    </section>
  );
}
