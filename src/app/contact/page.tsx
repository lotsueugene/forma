'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Stack, EnvelopeSimple, User, PaperPlaneTilt, Check } from '@phosphor-icons/react';

const FORM_API_ENDPOINT = '/api/public/forms/cmnfn0fk00001fyigqcj9ce4g';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(FORM_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
              Forma
            </span>
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="py-16 lg:py-24">
        <div className="mx-auto max-w-xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                Get in touch
              </h1>
              <p className="text-gray-600">
                Have a question or need help? We'd love to hear from you.
              </p>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} weight="bold" className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Message sent!
                </h2>
                <p className="text-gray-600 mb-6">
                  Thanks for reaching out. We'll get back to you as soon as possible.
                </p>
                <Link href="/" className="btn btn-primary">
                  Back to Home
                </Link>
              </motion.div>
            ) : (
              <div className="card p-6 lg:p-8">
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="form-field">
                    <label htmlFor="name" className="form-label">Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        className="input input-with-icon"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="email" className="form-label">Email</label>
                    <div className="relative">
                      <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="input input-with-icon"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      className="input resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-full justify-center"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Send Message
                        <PaperPlaneTilt size={18} weight="bold" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
