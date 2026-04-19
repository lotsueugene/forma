'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';

const PLACEHOLDERS_DESKTOP = [
  'Create a contact form with validation...',
  'Build a survey with conditional logic...',
  'Design a registration form with file upload...',
  'Set up webhook integration with Slack...',
];

const PLACEHOLDERS_MOBILE = [
  'Create a contact form...',
  'Build a survey...',
  'Design a registration form...',
  'Set up a webhook...',
];

const SUGGESTION_CHIPS = [
  'NPS survey',
  'Lead capture',
  'Event RSVP',
  'Feedback form',
];

const FORM_OPTIONS = [
  { letter: 'A', label: 'Multiple choice', selected: true },
  { letter: 'B', label: 'Open text', selected: false },
  { letter: 'C', label: 'File upload', selected: false },
  { letter: 'D', label: 'Rating scale', selected: false },
];

export default function HeroSection() {
  const [placeholder, setPlaceholder] = useState('');
  const [phIndex, setPhIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'api'>('dashboard');
  const [selectedOption, setSelectedOption] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const PLACEHOLDERS = isMobile ? PLACEHOLDERS_MOBILE : PLACEHOLDERS_DESKTOP;

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
  }, [charIndex, isDeleting, phIndex, PLACEHOLDERS]);

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 lg:px-9 overflow-hidden">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column */}
          <motion.div
            className="flex flex-col gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            {/* Eyebrow badge */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 font-mono text-[11px] sm:text-[12px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-safety-orange animate-pulse" />
                Now in public beta
              </span>
            </motion.div>

            {/* Headline with rise-in */}
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } } }}
              className="text-4xl sm:text-5xl lg:text-[72px] font-normal tracking-[-0.03em] leading-[1.05] text-gray-900"
            >
              Forms that feel
              <br />
              like a conversation<span className="text-safety-orange">.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="font-mono text-base sm:text-lg text-gray-600 max-w-lg leading-relaxed"
            >
              Build, deploy, and scale forms in minutes. Unlimited submissions,
              built-in payments, and an API that developers love.
            </motion.p>

            {/* Prompt Widget */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="w-full max-w-xl"
            >
              <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                {/* Tabs */}
                <div className="flex gap-0 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2.5 font-mono text-[11px] sm:text-[12px] uppercase tracking-wider transition-colors ${
                      activeTab === 'dashboard'
                        ? 'bg-gray-50 text-gray-900 border-b-2 border-safety-orange'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('api')}
                    className={`px-4 py-2.5 font-mono text-[11px] sm:text-[12px] uppercase tracking-wider transition-colors ${
                      activeTab === 'api'
                        ? 'bg-gray-50 text-gray-900 border-b-2 border-safety-orange'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    API
                  </button>
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-safety-orange font-mono text-sm sm:text-lg">&gt;</span>
                    <input
                      type="text"
                      placeholder={placeholder + '|'}
                      className="flex-1 min-w-0 bg-transparent font-mono text-[11px] sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                      readOnly
                    />
                    <Link
                      href="/signup"
                      className="p-1.5 sm:p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-safety-orange hover:border-safety-orange/30 transition-colors flex-shrink-0"
                    >
                      <ArrowRight size={16} weight="bold" />
                    </Link>
                  </div>

                  {/* Suggestion chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <span
                        key={chip}
                        className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-mono text-[10px] sm:text-[11px] uppercase cursor-pointer hover:bg-safety-orange/10 hover:text-safety-orange transition-colors"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap items-center gap-4"
            >
              <Magnetic pull={0.1}>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-safety-orange text-white font-mono text-[13px] uppercase tracking-[-0.015rem] hover:bg-[#ee6018] transition-colors"
                >
                  Get Started Free
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </Magnetic>
              <Magnetic pull={0.1}>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 px-4 py-3 font-mono text-[13px] uppercase text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View Features
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* Right Column - Floating Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Glow */}
            <div
              className="absolute -inset-12 pointer-events-none -z-10"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(239,111,46,0.08) 0%, transparent 70%)',
              }}
            />

            {/* Main Card */}
            <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                <div>
                  <div className="font-medium text-gray-900 text-lg">Customer Feedback</div>
                  <div className="text-xs text-gray-500 font-mono uppercase mt-0.5">Question 3 of 8</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </div>
              </div>

              {/* Question */}
              <p className="text-gray-800 text-[15px] mb-5">
                What type of response would you like to collect?
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {FORM_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.letter}
                    onClick={() => setSelectedOption(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-all duration-200 ${
                      selectedOption === i
                        ? 'border-safety-orange bg-safety-orange/5 text-gray-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-medium ${
                        selectedOption === i
                          ? 'bg-safety-orange text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {opt.letter}
                    </span>
                    {opt.label}
                    {selectedOption === i && (
                      <Check size={16} className="text-safety-orange ml-auto" weight="bold" />
                    )}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 uppercase mb-2">
                  <span>Progress</span>
                  <span>37%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-safety-orange rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '37%' }}
                    transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="absolute -right-3 top-20 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-safety-orange" />
                <span className="text-xs font-mono uppercase tracking-wider text-gray-700">
                  247 this week
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="absolute -left-3 bottom-20 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Check size={14} weight="bold" className="text-green-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-gray-700">
                  99.9% uptime
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex justify-center mt-16 sm:mt-24"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-gray-400"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest">Scroll</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <rect x="1" y="1" width="14" height="22" rx="7" stroke="currentColor" strokeWidth="1.5" />
              <motion.circle
                cx="8"
                cy="8"
                r="2"
                fill="currentColor"
                animate={{ cy: [8, 16, 8] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
