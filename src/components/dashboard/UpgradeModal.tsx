'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Stack, Check, X } from '@phosphor-icons/react';

const TRIAL_BENEFITS = [
  'Unlimited forms & submissions',
  'Email notifications on submissions',
  'Analytics & geo data',
  'Custom domains & branding',
  'Payment collection via Stripe',
  'Team collaboration (up to 10 members)',
  'Integrations (Slack, Notion, Zapier)',
  'API access & webhooks',
  'Remove "Powered by Forma" branding',
  'Social preview images & favicons',
];

export default function UpgradeModal({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header with logo */}
            <div className="bg-gradient-to-br from-safety-orange to-[#d15010] px-6 py-8 text-center text-white">
              <div className="w-14 h-14 mx-auto mb-4 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Stack size={28} weight="fill" className="text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-1">
                {feature ? `${feature} is a Pro feature` : 'Unlock Pro features'}
              </h2>
              <p className="text-white/80 text-sm">
                Try everything free for 14 days. No credit card required.
              </p>
            </div>

            {/* Benefits */}
            <div className="px-6 py-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Everything included in your trial</p>
              <div className="space-y-2.5">
                {TRIAL_BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-safety-orange/10 flex items-center justify-center shrink-0">
                      <Check size={12} weight="bold" className="text-safety-orange" />
                    </div>
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-5 space-y-2">
              <Link
                href="/dashboard/settings?tab=billing"
                className="block w-full text-center py-3 bg-safety-orange text-white font-semibold rounded-xl hover:bg-[#d15010] transition-colors"
                onClick={onClose}
              >
                Start Free 14-Day Trial
              </Link>
              <button
                onClick={onClose}
                className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Maybe later
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
