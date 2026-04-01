'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stack, X } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 md:border-b-0 lg:px-9 bg-white backdrop-blur-md">
      <div className="mx-auto flex items-center justify-between py-5 max-w-[1400px] relative">
        {/* Logo - Left */}
        <a href="/" className="z-50 flex items-center gap-2">
          <Stack size={24} weight="fill" className="text-gray-900" />
          <span className="font-sans text-xl font-medium tracking-[-0.04em] text-gray-900">
            Forma
          </span>
        </a>

        {/* Center Navigation - Features, Pricing, Docs, Blog */}
        <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
          <ul className="group/menu flex items-center space-x-8">
            {navLinks.map((link) => (
              <li
                key={link.href}
                className="relative opacity-100 transition-opacity duration-250 group-hover/menu:opacity-60 hover:!opacity-100"
              >
                <Magnetic pull={0.1}>
                  <Link
                    href={link.href}
                    className="text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase relative flex w-fit items-center transition-colors duration-200 hover:text-safety-orange group after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-in-out hover:after:w-full text-gray-700"
                  >
                    {link.label}
                  </Link>
                </Magnetic>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right - Sign In & Get Started Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Magnetic pull={0.1}>
            <Link
              href="/login"
              className="group relative w-max cursor-pointer items-center justify-center border transition-colors duration-150 will-change-transform bg-transparent hover:bg-gray-100 text-gray-700 overflow-clip rounded-sm border-gray-300 h-[32px] px-4 flex"
            >
              <span className="relative z-10 flex items-center uppercase">
                <p className="text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase">
                  Sign In
                </p>
              </span>
            </Link>
          </Magnetic>
          <Magnetic pull={0.1}>
            <Link
              href="/signup"
              className="group relative w-max cursor-pointer items-center justify-center border transition-colors duration-150 will-change-transform bg-[#ef6f2e] hover:bg-[#ee6018] text-white overflow-clip rounded-sm border-transparent h-[32px] px-4 flex"
            >
              <span className="relative z-10 flex items-center uppercase">
                <p className="text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase">
                  Get Started
                </p>
              </span>
            </Link>
          </Magnetic>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="relative -m-1 flex cursor-pointer items-center justify-center p-1 text-gray-700 hover:text-gray-900 lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 6H21V8H3V6Z" fill="currentColor" />
              <path d="M3 11H21V13H3V11Z" fill="currentColor" />
              <path d="M3 16H21V18H3V16Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[65px] z-40 bg-white border-b border-gray-200 lg:hidden"
          >
            <nav className="flex flex-col p-6">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-700 border-b border-gray-200 transition-colors hover:text-safety-orange"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.05 }}
                className="mt-6 flex flex-col gap-3"
              >
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-3 text-center font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-3 text-center font-mono text-[13px] uppercase tracking-[-0.015rem] bg-[#ef6f2e] text-white rounded-sm"
                >
                  Get Started
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
