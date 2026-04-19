'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Stack, List, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';

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

  const handleScroll = useCallback(() => {
    const navBottom = 80;
    const darkSections = document.querySelectorAll('#pricing, #final-cta');
    let inDark = false;
    darkSections.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top <= navBottom && r.bottom >= navBottom) {
        inDark = true;
      }
    });
    setIsDark(inDark);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <>
      <nav className={`landing-nav ${isDark ? 'nav-dark' : ''}`}>
        <Link href="/" className="nav-logo">
          <Stack size={22} weight="fill" color="#ef6f2e" />
          Forma
        </Link>

        <div className="nav-center">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-cta">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-landing btn-primary-landing">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-landing btn-ghost-landing">
                Sign in
              </Link>
              <Link href="/signup" className="btn-landing btn-primary-landing">
                Get started
              </Link>
            </>
          )}
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hidden-desktop"
            aria-label="Toggle menu"
            style={{ display: 'none' }}
          >
            {mobileMenuOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[64px] z-40 bg-white border-b border-gray-200 lg:hidden"
          >
            <nav className="flex flex-col p-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-700 border-b border-gray-200 transition-colors hover:text-safety-orange"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-landing btn-primary-landing"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-landing btn-ghost-landing"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-landing btn-primary-landing"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
