'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Code, WebhooksLogo, Lightning } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';

const PLACEHOLDERS = [
  'Create a contact form with validation...',
  'Build a survey with conditional logic...',
  'Design a registration form with file upload...',
  'Set up webhook integration with Slack...',
];

const staggerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
};

export default function HeroSection() {
  const [placeholder, setPlaceholder] = useState('');
  const [phIndex, setPhIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentString = PLACEHOLDERS[phIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && charIndex === currentString.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2500);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    } else {
      timeout = setTimeout(
        () => {
          setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
        },
        isDeleting ? 25 : 50
      );
    }

    setPlaceholder(currentString.substring(0, charIndex));
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phIndex]);

  return (
    <section className="min-h-screen pt-24 pb-16 px-4 lg:px-9">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-10rem)]">
          {/* Left Column - Content */}
          <motion.div
            className="flex flex-col gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.15 },
              },
            }}
          >
            {/* Headline */}
            <motion.h1
              variants={staggerVariants}
              className="text-4xl sm:text-5xl lg:text-7xl font-normal tracking-tight text-gray-900"
            >
              Forma<span className="text-safety-orange">.</span>
            </motion.h1>

            {/* Description */}
            <motion.div variants={staggerVariants} className="space-y-3 sm:space-y-4 max-w-xl">
              <p className="font-mono text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                The modern way to build and manage forms.
              </p>
              <p className="font-mono text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                Collect submissions, automate workflows, and integrate with your
                favorite tools. Enterprise-grade security included.
              </p>
            </motion.div>

            {/* Interactive Input */}
            <motion.div variants={staggerVariants} className="w-full max-w-xl">
              <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="flex gap-2 sm:gap-3 border-b border-gray-200 px-3 py-2 sm:p-3">
                  <span className="px-2 sm:px-3 py-1 rounded bg-gray-100 border border-gray-200 font-mono text-[10px] sm:text-[13px] uppercase text-gray-900">
                    Dashboard
                  </span>
                  <span className="px-2 sm:px-3 py-1 font-mono text-[10px] sm:text-[13px] uppercase text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
                    API / CLI
                  </span>
                </div>

                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-safety-orange font-mono text-sm sm:text-lg">&gt;</span>
                    <input
                      type="text"
                      placeholder={placeholder + '|'}
                      className="flex-1 min-w-0 bg-transparent font-mono text-[11px] sm:text-lg text-gray-900 placeholder:text-gray-500 outline-none truncate"
                      readOnly
                    />
                    <Link
                      href="/signup"
                      className="p-1.5 sm:p-2 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <ArrowRight size={16} weight="bold" className="sm:hidden" />
                      <ArrowRight size={20} weight="bold" className="hidden sm:block" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={staggerVariants} className="flex flex-wrap items-center gap-4">
              <Magnetic pull={0.1}>
                <Link href="/signup" className="btn btn-primary">
                  Get Started Free
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </Magnetic>

              <Magnetic pull={0.1}>
                <Link
                  href="#features"
                  className="font-mono text-[13px] uppercase text-gray-700 hover:text-gray-900 transition-colors px-4 py-3"
                >
                  View Features
                </Link>
              </Magnetic>
            </motion.div>

            {/* Platform Integrations */}
            <motion.div variants={staggerVariants} className="pt-6 sm:pt-8 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-safety-orange" />
                <p className="font-mono text-[11px] sm:text-[13px] uppercase tracking-wider text-gray-700">
                  Platform Integrations
                </p>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-8 opacity-60">
                <span className="text-base sm:text-xl font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                  Stripe
                </span>
                <span className="text-base sm:text-xl font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                  Slack
                </span>
                <span className="text-base sm:text-xl font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                  Zapier
                </span>
                <span className="text-base sm:text-xl font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                  HubSpot
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Form Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* Glow effect - subtle, behind the card */}
            <div className="absolute -inset-8 bg-safety-orange/10 blur-3xl rounded-full pointer-events-none -z-10" />

            {/* Main card */}
            <div className="relative rounded-xl border border-gray-200 bg-white p-6 space-y-5 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-safety-orange/20 flex items-center justify-center">
                    <Lightning size={20} className="text-safety-orange" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Contact Form</div>
                    <div className="text-xs text-gray-500 font-mono uppercase">Pro Template</div>
                  </div>
                </div>
                <span className="badge badge-accent">Live</span>
              </div>

              {/* Form Fields Preview */}
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label">Full Name</label>
                  <div className="input">Marcus Chen</div>
                </div>
                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <div className="input">marcus@techventures.io</div>
                </div>
                <div className="form-field">
                  <label className="form-label">Message</label>
                  <div className="input h-20 text-gray-500">Interested in enterprise plan...</div>
                </div>
                <Link href="/login" className="btn btn-primary w-full text-center">Submit</Link>
              </div>

              {/* Live indicator */}
              <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
                  <span className="font-mono uppercase tracking-wider text-gray-500">
                    Receiving submissions
                  </span>
                </div>
                <span className="font-mono uppercase tracking-wider text-gray-500">247 this week</span>
              </div>
            </div>

            {/* Floating cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -right-4 top-24 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Code size={16} className="text-safety-orange" />
                <span className="text-xs font-mono uppercase tracking-wider text-gray-700">
                  API Ready
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -left-4 bottom-24 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <WebhooksLogo size={16} className="text-safety-orange" />
                <span className="text-xs font-mono uppercase tracking-wider text-gray-700">
                  Webhooks
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
