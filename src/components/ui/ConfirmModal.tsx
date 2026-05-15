'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, X } from '@phosphor-icons/react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  // When set, renders an input and keeps Confirm disabled until the typed
  // value matches exactly. Use for high-stakes ops (e.g. delete a user by
  // typing their email) to make the action deliberate.
  requireTypedConfirmation?: string;
  typedConfirmationLabel?: string;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  requireTypedConfirmation,
  typedConfirmationLabel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');

  // Reset the typed input every time the modal opens so a previous match
  // can't auto-confirm a different deletion.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const typedMatches =
    !requireTypedConfirmation || typed === requireTypedConfirmation;
  const confirmDisabled = loading || !typedMatches;
  const colors = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    default: {
      icon: 'bg-safety-orange/10 text-safety-orange',
      button: 'bg-safety-orange hover:bg-[#d15010] text-white',
    },
  };

  const style = colors[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full ${style.icon} flex items-center justify-center mx-auto mb-4`}>
                <Warning size={24} weight="fill" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
            {requireTypedConfirmation && (
              <div className="px-6 pb-2 text-left">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {typedConfirmationLabel || `Type "${requireTypedConfirmation}" to confirm`}
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !confirmDisabled) onConfirm();
                  }}
                />
              </div>
            )}
            <div className="px-6 pb-6 pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${style.button}`}
              >
                {loading ? 'Please wait...' : confirmText}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={16} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
