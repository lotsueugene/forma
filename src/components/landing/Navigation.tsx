'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stack, X, List } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && session?.user;

  const checkDarkSections = useCallback(() => {
    const darkIds = ['pricing', 'final-cta'];
    const navHeight = 72;
    const navCenter = navHeight / 2;

    for (const id of darkIds) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= navCenter && rect.bottom >= navCenter) {
          setIsDark(true);
          return;
        }
      }
    }
    setIsDark(false);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', checkDarkSections, { passive: true });
    checkDarkSections();
    return () => window.removeEventListener('scroll', checkDarkSections);
  }, [checkDarkSections]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: isDark ? 'rgba(10,10,10,0.72)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="mx-auto flex items-center justify-between py-4 px-4 lg:px-9 max-w-[1400px] relative">
        {/* Logo */}
        <Link href="/" className="z-50 flex items-center gap-2">
          <Stack
            size={24}
            weight="fill"
            className={`transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}
          />
          <span
            className={`font-sans text-xl font-medium tracking-[-0.04em] transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Forma
          </span>
        </Link>

        {/* Center Navigation */}
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
                    className={`text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase relative flex w-fit items-center transition-colors duration-200 hover:text-safety-orange after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-in-out hover:after:w-full ${isDark ? 'text-white/70' : 'text-gray-700'}`}
                  >
                    {link.label}
                  </Link>
                </Magnetic>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <Magnetic pull={0.1}>
              <Link
                href="/dashboard"
                className="group relative cursor-pointer items-center justify-center border transition-colors duration-150 bg-safety-orange hover:bg-[#ee6018] text-white overflow-clip rounded-md border-transparent h-[36px] px-5 flex"
              >
                <span className="text-pretty font-mono text-[12px] leading-[100%] tracking-[-0.015rem] uppercase">
                  Dashboard
                </span>
              </Link>
            </Magnetic>
          ) : (
            <>
              <Magnetic pull={0.1}>
                <Link
                  href="/login"
                  className={`group relative cursor-pointer items-center justify-center transition-colors duration-150 overflow-clip rounded-md h-[36px] px-4 flex font-mono text-[12px] uppercase tracking-[-0.015rem] ${isDark ? 'text-white/80 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  Sign in
                </Link>
              </Magnetic>
              <Magnetic pull={0.1}>
                <Link
                  href="/signup"
                  className="group relative cursor-pointer items-center justify-center border transition-colors duration-150 bg-safety-orange hover:bg-[#ee6018] text-white overflow-clip rounded-md border-transparent h-[36px] px-5 flex font-mono text-[12px] uppercase tracking-[-0.015rem]"
                >
                  Get started
                </Link>
              </Magnetic>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`relative -m-1 flex cursor-pointer items-center justify-center p-1 lg:hidden transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-700 hover:text-gray-900'}`}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <List size={24} weight="bold" />
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
            className={`fixed inset-x-0 top-[65px] z-40 lg:hidden ${isDark ? 'bg-[#0a0a0a] border-b border-white/10' : 'bg-white border-b border-gray-200'}`}
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
                    className={`block py-3 font-mono text-[13px] uppercase tracking-[-0.015rem] border-b transition-colors hover:text-safety-orange ${isDark ? 'text-white/70 border-white/10' : 'text-gray-700 border-gray-200'}`}
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
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 text-center font-mono text-[13px] uppercase tracking-[-0.015rem] bg-safety-orange text-white rounded-md"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block w-full py-3 text-center font-mono text-[13px] uppercase tracking-[-0.015rem] ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-3 text-center font-mono text-[13px] uppercase tracking-[-0.015rem] bg-safety-orange text-white rounded-md"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
