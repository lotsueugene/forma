'use client';

import Link from 'next/link';

export default function FinalCTASection() {
  return (
    <section className="final-cta-section" id="final-cta">
      <h2>Ship your<br/>form today<span className="white-dot">.</span></h2>
      <p>Free to start · 3 forms · no credit card</p>
      <Link href="/signup" className="btn-white btn-lg-landing">
        Get started
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </Link>
    </section>
  );
}
