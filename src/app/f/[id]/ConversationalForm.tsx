'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stack,
  Check,
  Spinner,
  ArrowRight,
  ArrowUp,
  Star,
  UploadSimple,
  File as FileIcon,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import BookingField from '@/components/forms/BookingField';

interface FieldCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value?: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  condition?: FieldCondition;
  defaultValue?: string;
  mediaUrl?: string;
  amount?: number;
  currency?: string;
}

interface FormSettings {
  branding?: {
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  thankYou?: {
    heading?: string;
    message?: string;
    redirectUrl?: string;
    showBranding?: boolean;
  };
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  settings?: FormSettings | null;
}

function evaluateCondition(
  condition: FieldCondition | undefined,
  formData: Record<string, string | string[]>
): boolean {
  if (!condition) return true;
  const fieldValue = formData[condition.fieldId];
  const valueStr = Array.isArray(fieldValue) ? fieldValue.join(', ') : (fieldValue || '');
  switch (condition.operator) {
    case 'equals': return valueStr === condition.value;
    case 'not_equals': return valueStr !== condition.value;
    case 'contains': return valueStr.toLowerCase().includes((condition.value || '').toLowerCase());
    case 'not_empty': return valueStr.trim() !== '';
    case 'is_empty': return valueStr.trim() === '';
    default: return true;
  }
}

interface ConversationalFormProps {
  form: Form;
  formId: string;
  onSubmit: (formData: Record<string, string | string[]>) => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string;
  onFileChange: (fieldId: string, file: File | null) => void;
  formData: Record<string, string | string[]>;
  setFormData: (fn: (prev: Record<string, string | string[]>) => Record<string, string | string[]>) => void;
}

export default function ConversationalForm({
  form,
  formId,
  onSubmit,
  isSubmitting,
  isSubmitted,
  error,
  onFileChange,
  formData,
  setFormData,
}: ConversationalFormProps) {
  const accent = form.settings?.branding?.accentColor || '#ef6f2e';
  const bg = form.settings?.branding?.backgroundColor || '#ffffff';
  const textColor = form.settings?.branding?.textColor || '#111827';
  const isLightBg = parseInt(bg.slice(1, 3), 16) * 0.299 + parseInt(bg.slice(3, 5), 16) * 0.587 + parseInt(bg.slice(5, 7), 16) * 0.114 > 150;

  // Filter to visible, interactive fields only
  const visibleFields = form.fields.filter(
    (f) => f.type !== 'page_break' && f.type !== 'hidden' && evaluateCondition(f.condition, formData)
  );

  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = welcome screen
  const [direction, setDirection] = useState(1);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const totalQuestions = visibleFields.length;
  const isOnQuestion = currentIndex >= 0 && currentIndex < totalQuestions;
  const currentField = isOnQuestion ? visibleFields[currentIndex] : null;

  // Auto-focus input when question changes
  useEffect(() => {
    if (isOnQuestion) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentIndex, isOnQuestion]);

  const isCurrentFieldValid = useCallback(() => {
    if (!currentField) return true;
    const value = formData[currentField.id];
    if (!currentField.required) return true;
    if (Array.isArray(value)) return value.length > 0;
    return (value || '').toString().trim() !== '';
  }, [currentField, formData]);

  const goNext = useCallback(() => {
    if (!isCurrentFieldValid()) return;
    setDirection(1);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Submit
      onSubmit(formData);
    }
  }, [currentIndex, totalQuestions, isCurrentFieldValid, onSubmit, formData]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else if (currentIndex === 0) {
      setCurrentIndex(-1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't intercept Enter on textareas
        if (currentField?.type === 'textarea') return;
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, currentField?.type]);

  const handleChange = (fieldId: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      return {
        ...prev,
        [fieldId]: checked ? [...current, option] : current.filter((v) => v !== option),
      };
    });
  };

  // Auto-advance for select/radio after selection
  const handleAutoAdvance = (fieldId: string, value: string) => {
    handleChange(fieldId, value);
    setTimeout(() => {
      setDirection(1);
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 400);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({
      y: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  // Thank you screen
  if (isSubmitted) {
    const thankYou = form.settings?.thankYou;
    if (thankYou?.redirectUrl && typeof window !== 'undefined') {
      window.location.href = thankYou.redirectUrl;
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Spinner size={32} className="animate-spin" style={{ color: accent }} />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: bg }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Check size={40} style={{ color: accent }} />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: textColor }}>
            {thankYou?.heading || 'Thank you!'}
          </h1>
          <p className="text-lg" style={{ color: `${textColor}88` }}>
            {thankYou?.message || 'Your response has been submitted successfully.'}
          </p>
          {thankYou?.showBranding !== false && (
            <div className="mt-10 flex items-center justify-center gap-2 text-sm" style={{ color: `${textColor}44` }}>
              <span>Powered by</span>
              <Link href="/" className="flex items-center gap-1 font-medium" style={{ color: accent }}>
                <Stack size={16} weight="fill" />
                Forma
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: bg,
        color: textColor,
      }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ backgroundColor: `${textColor}10` }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: accent }}
          animate={{ width: `${currentIndex < 0 ? 0 : ((currentIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Question counter */}
      {isOnQuestion && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-8 z-40">
          <span className="text-sm font-mono" style={{ color: `${textColor}44` }}>
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Welcome screen */}
            {currentIndex === -1 && (
              <motion.div
                key="welcome"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                >
                  {form.name}
                </motion.h1>
                {form.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg sm:text-xl mb-10 leading-relaxed"
                    style={{ color: `${textColor}77` }}
                  >
                    {form.description}
                  </motion.p>
                )}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => { setDirection(1); setCurrentIndex(0); }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: accent, boxShadow: `0 4px 14px ${accent}40` }}
                >
                  Start
                  <ArrowRight size={20} weight="bold" />
                </motion.button>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 text-sm"
                  style={{ color: `${textColor}33` }}
                >
                  Takes about {Math.max(1, Math.ceil(totalQuestions * 0.3))} min
                </motion.p>
              </motion.div>
            )}

            {/* Question screens */}
            {isOnQuestion && currentField && (
              <motion.div
                key={currentField.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {/* Question number */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-mono" style={{ color: accent }}>
                    {currentIndex + 1}
                  </span>
                  <ArrowRight size={12} style={{ color: `${textColor}33` }} />
                </div>

                {/* Question label */}
                <h2 className="text-2xl sm:text-3xl font-semibold mb-2 leading-snug">
                  {currentField.label}
                  {currentField.required && <span style={{ color: accent }}> *</span>}
                </h2>

                {currentField.placeholder && currentField.type !== 'select' && (
                  <p className="text-base mb-6" style={{ color: `${textColor}55` }}>
                    {currentField.placeholder}
                  </p>
                )}

                {!currentField.placeholder && <div className="mb-6" />}

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mb-4"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Field input */}
                <div className="mb-8">
                  {renderConversationalField(
                    currentField,
                    formData,
                    handleChange,
                    handleCheckboxChange,
                    onFileChange,
                    handleAutoAdvance,
                    inputRef,
                    accent,
                    textColor,
                    isLightBg,
                    formId
                  )}
                </div>

                {/* OK / Next button */}
                {currentField.type !== 'radio' && currentField.type !== 'select' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <button
                      onClick={goNext}
                      disabled={isSubmitting || (currentField.required && !isCurrentFieldValid())}
                      className={cn(
                        'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200',
                        currentField.required && !isCurrentFieldValid()
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:scale-[1.02] active:scale-[0.98]'
                      )}
                      style={{ backgroundColor: accent }}
                    >
                      {isSubmitting ? (
                        <Spinner size={18} className="animate-spin" />
                      ) : currentIndex === totalQuestions - 1 ? (
                        'Submit'
                      ) : (
                        'OK'
                      )}
                      {!isSubmitting && <Check size={16} weight="bold" />}
                    </button>
                    <span className="text-xs" style={{ color: `${textColor}33` }}>
                      press <strong>Enter ↵</strong>
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex items-center gap-2 z-40">
        <button
          onClick={goPrev}
          disabled={currentIndex <= -1}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            currentIndex <= -1 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105'
          )}
          style={{
            backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
            color: textColor,
          }}
        >
          <ArrowUp size={18} />
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex < 0 || !isCurrentFieldValid()}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all rotate-180',
            (currentIndex < 0 || !isCurrentFieldValid()) ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105'
          )}
          style={{
            backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
            color: textColor,
          }}
        >
          <ArrowUp size={18} />
        </button>
      </div>

      {/* Branding */}
      {form.settings?.thankYou?.showBranding !== false && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: `${textColor}55` }}
          >
            <Stack size={18} weight="fill" />
            Powered by <span style={{ color: accent }} className="font-semibold">Forma</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function renderConversationalField(
  field: FormField,
  formData: Record<string, string | string[]>,
  onChange: (fieldId: string, value: string) => void,
  onCheckboxChange: (fieldId: string, option: string, checked: boolean) => void,
  onFileChange: (fieldId: string, file: File | null) => void,
  onAutoAdvance: (fieldId: string, value: string) => void,
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>,
  accent: string,
  textColor: string,
  isLightBg: boolean,
  formId?: string,
) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 0',
    border: 'none',
    borderBottom: `2px solid ${isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'}`,
    background: 'transparent',
    color: textColor,
    fontSize: '20px',
    lineHeight: 1.5,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
      return (
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type={field.type === 'phone' ? 'tel' : field.type}
          placeholder="Type your answer here..."
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderBottomColor = accent)}
          onBlur={(e) => (e.target.style.borderBottomColor = isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)')}
          autoFocus
        />
      );
    case 'date':
      return (
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="date"
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderBottomColor = accent)}
          onBlur={(e) => (e.target.style.borderBottomColor = isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)')}
          autoFocus
        />
      );
    case 'textarea':
      return (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          placeholder="Type your answer here..."
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'none', minHeight: '120px' }}
          onFocus={(e) => (e.target.style.borderBottomColor = accent)}
          onBlur={(e) => (e.target.style.borderBottomColor = isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)')}
          autoFocus
        />
      );
    case 'radio':
      return (
        <div className="space-y-3">
          {(field.options || []).map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = formData[field.id] === option;
            return (
              <motion.button
                key={option}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onAutoAdvance(field.id, option)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200',
                  isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                )}
                style={{
                  border: `2px solid ${isSelected ? accent : isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: isSelected ? `${accent}10` : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    border: `2px solid ${isSelected ? accent : isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                    color: isSelected ? accent : `${textColor}66`,
                    backgroundColor: isSelected ? `${accent}15` : 'transparent',
                  }}
                >
                  {letter}
                </span>
                <span className="text-base font-medium" style={{ color: textColor }}>
                  {option}
                </span>
                {isSelected && <Check size={18} weight="bold" className="ml-auto" style={{ color: accent }} />}
              </motion.button>
            );
          })}
        </div>
      );
    case 'select':
      return (
        <div className="space-y-3">
          {(field.options || []).map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = formData[field.id] === option;
            return (
              <motion.button
                key={option}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onAutoAdvance(field.id, option)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200',
                  isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                )}
                style={{
                  border: `2px solid ${isSelected ? accent : isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: isSelected ? `${accent}10` : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    border: `2px solid ${isSelected ? accent : isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                    color: isSelected ? accent : `${textColor}66`,
                  }}
                >
                  {letter}
                </span>
                <span className="text-base font-medium" style={{ color: textColor }}>
                  {option}
                </span>
                {isSelected && <Check size={18} weight="bold" className="ml-auto" style={{ color: accent }} />}
              </motion.button>
            );
          })}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-3">
          {(field.options || []).map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isChecked = ((formData[field.id] as string[]) || []).includes(option);
            return (
              <motion.button
                key={option}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onCheckboxChange(field.id, option, !isChecked)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200 hover:scale-[1.01]"
                style={{
                  border: `2px solid ${isChecked ? accent : isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: isChecked ? `${accent}10` : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    border: `2px solid ${isChecked ? accent : isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                    color: isChecked ? accent : `${textColor}66`,
                    backgroundColor: isChecked ? `${accent}15` : 'transparent',
                  }}
                >
                  {isChecked ? <Check size={14} weight="bold" /> : letter}
                </span>
                <span className="text-base font-medium" style={{ color: textColor }}>
                  {option}
                </span>
              </motion.button>
            );
          })}
          <p className="text-xs" style={{ color: `${textColor}44` }}>
            Choose as many as you like
          </p>
        </div>
      );
    case 'file': {
      const fileData = formData[field.id] ? (() => { try { return JSON.parse(formData[field.id] as string); } catch { return null; } })() : null;
      return (
        <div>
          {fileData ? (
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{ border: `2px solid ${accent}40`, backgroundColor: `${accent}08` }}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
                <FileIcon size={24} style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: textColor }}>{fileData.name}</p>
                <p className="text-sm" style={{ color: `${textColor}55` }}>{(fileData.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => onFileChange(field.id, null)}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: `${textColor}44` }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label
              className="block rounded-xl p-10 text-center cursor-pointer transition-all duration-200 hover:scale-[1.01]"
              style={{
                border: `2px dashed ${isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                backgroundColor: isLightBg ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <UploadSimple size={36} className="mx-auto mb-3" style={{ color: `${textColor}33` }} />
              <p className="font-medium mb-1" style={{ color: textColor }}>Choose a file or drag it here</p>
              <p className="text-sm" style={{ color: `${textColor}44` }}>Max 50MB</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                onChange={(e) => onFileChange(field.id, e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      );
    }
    case 'rating':
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(field.id, star.toString())}
              className="p-1"
            >
              <Star
                size={40}
                weight={Number(formData[field.id]) >= star ? 'fill' : 'regular'}
                className="transition-colors"
                style={{
                  color: Number(formData[field.id]) >= star ? '#eab308' : `${textColor}25`,
                }}
              />
            </motion.button>
          ))}
        </div>
      );
    case 'image':
      return field.mediaUrl ? (
        <div className="rounded-xl overflow-hidden">
          <img src={field.mediaUrl} alt={field.label} className="w-full h-auto max-h-80 object-cover rounded-xl" loading="lazy" />
        </div>
      ) : null;
    case 'video': {
      const videoUrl = field.mediaUrl || '';
      let embedUrl = '';
      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      return embedUrl ? (
        <div className="rounded-xl overflow-hidden aspect-video">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={field.label} />
        </div>
      ) : null;
    }
    case 'payment': {
      const symbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£' };
      const sym = symbols[field.currency || 'usd'] || '$';
      return (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}>
          <div className="text-4xl font-bold mb-1">{sym}{(field.amount || 0).toFixed(2)}</div>
          <p className="text-sm" style={{ color: `${textColor}55` }}>One-time payment via Stripe</p>
        </div>
      );
    }
    case 'booking':
      return (
        <BookingField
          formId={formId || ''}
          fieldId={field.id}
          value={formData[field.id] as string}
          onChange={(val) => onChange(field.id, val)}
          required={field.required}
          accent={accent}
          textColor={textColor}
          isLightBg={isLightBg}
        />
      );
    default:
      return null;
  }
}
