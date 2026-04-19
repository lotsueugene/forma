'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';

export default function FinalCTASection() {
  return (
    <section
      id="final-cta"
      className="relative py-24 sm:py-32 lg:py-40 bg-safety-orange overflow-hidden"
    >
      {/* Radial gradient overlays for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 lg:px-9 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-[72px] font-normal tracking-[-0.03em] leading-[1.05] text-white mb-6">
            Ship your form
            <br />
            today<span className="text-white/60">.</span>
          </h2>

          <p className="font-mono text-[14px] sm:text-[16px] text-white/70 max-w-lg mx-auto mb-10 leading-relaxed">
            Join thousands of teams already using Forma to collect data,
            automate workflows, and grow their business.
          </p>

          <Magnetic pull={0.15}>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-[#0a0a0a] font-mono text-[13px] sm:text-[14px] uppercase tracking-[-0.015rem] font-medium hover:bg-white/90 transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight size={16} weight="bold" />
            </Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
