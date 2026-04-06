'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stack,
  Check,
  Spinner,
  UploadSimple,
  Star,
  ArrowLeft,
  ArrowRight,
  File as FileIcon,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Main domains where reCAPTCHA should be loaded (custom domains won't have reCAPTCHA)
const MAIN_DOMAINS = ['withforma.io', 'www.withforma.io', 'localhost', '127.0.0.1'];

// Extend window for grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

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
  nextPage?: number;
}

// Evaluate if a field's condition is met
function evaluateCondition(
  condition: FieldCondition | undefined,
  formData: Record<string, string | string[]>
): boolean {
  if (!condition) return true;

  const fieldValue = formData[condition.fieldId];
  const valueStr = Array.isArray(fieldValue) ? fieldValue.join(', ') : (fieldValue || '');

  switch (condition.operator) {
    case 'equals':
      return valueStr === condition.value;
    case 'not_equals':
      return valueStr !== condition.value;
    case 'contains':
      return valueStr.toLowerCase().includes((condition.value || '').toLowerCase());
    case 'not_empty':
      return valueStr.trim() !== '';
    case 'is_empty':
      return valueStr.trim() === '';
    default:
      return true;
  }
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

interface FormPageClientProps {
  formId: string;
}

export default function FormPageClient({ formId }: FormPageClientProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // Check if we're on a custom domain (reCAPTCHA won't work there)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isMain = MAIN_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
      setIsCustomDomain(!isMain);
    }
  }, []);

  // Split fields into pages based on page_break fields
  const getPages = (fields: FormField[]): { pages: FormField[][]; breaks: (FormField | null)[] } => {
    const pages: FormField[][] = [];
    const breaks: (FormField | null)[] = [null]; // first page has no page_break
    let currentPage: FormField[] = [];

    fields.forEach((field) => {
      if (field.type === 'page_break') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
        }
        breaks.push(field);
      } else {
        currentPage.push(field);
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return { pages: pages.length > 0 ? pages : [[]], breaks };
  };

  const { pages, breaks: pageBreaks } = form ? getPages(form.fields) : { pages: [[]], breaks: [null] };
  const totalSteps = pages.length;
  const isMultiStep = totalSteps > 1;
  const isLastStep = currentStep === totalSteps - 1;
  const currentPageFields = pages[currentStep] || [];

  const goToNextPage = () => {
    // Check if the current page's trailing page_break has a branch target
    const nextBreak = pageBreaks[currentStep + 1];
    if (nextBreak?.nextPage === -1) {
      // Skip to submit
      return true; // signal to submit
    }
    if (nextBreak?.nextPage !== undefined && nextBreak.nextPage !== null) {
      setCurrentStep(nextBreak.nextPage);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
    return false;
  };

  useEffect(() => {
    if (formId) {
      fetchForm();
    }
  }, [formId]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/public/forms/${formId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Form not found');
        return;
      }

      setForm(data.form);

      // Initialize form data with empty values
      const initialData: Record<string, string | string[]> = {};
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      data.form.fields.forEach((field: FormField) => {
        if (field.type === 'checkbox') {
          initialData[field.id] = [];
        } else if (field.type === 'hidden' && field.defaultValue) {
          // Resolve {{param}} placeholders from URL query params
          const resolved = field.defaultValue.replace(/\{\{(\w+)\}\}/g, (_, param) => {
            return urlParams?.get(param) || '';
          });
          initialData[field.id] = resolved;
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required file fields
    const visibleFields = form?.fields.filter((field) =>
      field.type !== 'page_break' && evaluateCondition(field.condition, formData)
    ) || [];

    for (const field of visibleFields) {
      if (field.required && field.type === 'file' && !formData[field.id]) {
        setError(`Please upload a file for "${field.label}"`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token if configured (skip on custom domains)
      let recaptchaToken: string | undefined;
      if (RECAPTCHA_SITE_KEY && !isCustomDomain && window.grecaptcha) {
        try {
          recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' });
        } catch (recaptchaErr) {
          console.warn('reCAPTCHA failed, continuing without token:', recaptchaErr);
        }
      }

      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(recaptchaToken && { recaptchaToken }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to submit form');
        return;
      }

      const result = await response.json();

      // If payment is required, redirect to Stripe Checkout
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const currentValues = (prev[fieldId] as string[]) || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter((v) => v !== option) };
      }
    });
  };

  const handleFileChange = async (fieldId: string, file: File | null) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, [fieldId]: '' }));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        [fieldId]: JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        }),
      }));
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size={32} className="text-safety-orange animate-spin" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Form Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const thankYou = form?.settings?.thankYou;
    const branding = form?.settings?.branding;

    // Redirect if configured
    if (thankYou?.redirectUrl) {
      if (typeof window !== 'undefined') {
        window.location.href = thankYou.redirectUrl;
      }
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: branding?.backgroundColor || '#ffffff' }}>
          <Spinner size={32} className="animate-spin" style={{ color: branding?.accentColor || undefined }} />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: branding?.backgroundColor || '#ffffff' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: branding?.accentColor ? `${branding.accentColor}20` : 'rgb(16 185 129 / 0.2)' }}
          >
            <Check size={32} style={{ color: branding?.accentColor || 'rgb(5 150 105)' }} />
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: branding?.textColor || '#111827' }}>
            {thankYou?.heading || 'Thank you!'}
          </h1>
          <p className="mb-6" style={{ color: branding?.textColor ? `${branding.textColor}99` : '#4b5563' }}>
            {thankYou?.message || 'Your response has been submitted successfully.'}
          </p>
          {thankYou?.showBranding !== false && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>Powered by</span>
              <Link href="/" className="flex items-center gap-1 text-safety-orange hover:text-safety-orange/80">
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
    <>
      {RECAPTCHA_SITE_KEY && !isCustomDomain && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="lazyOnload"
        />
      )}

      {(() => {
        const accent = form?.settings?.branding?.accentColor || '#ef6f2e';
        const bg = form?.settings?.branding?.backgroundColor || '#ffffff';
        const text = form?.settings?.branding?.textColor || '#111827';
        const textMuted = `${text}88`;
        const textFaint = `${text}44`;
        const isLightBg = parseInt(bg.slice(1, 3), 16) * 0.299 + parseInt(bg.slice(3, 5), 16) * 0.587 + parseInt(bg.slice(5, 7), 16) * 0.114 > 150;
        const cardBg = isLightBg ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)';
        const cardBorder = isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)';
        const cardShadow = isLightBg
          ? '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.3)';
        const inputBg = isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)';
        const inputBorder = isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
        const inputFocusBorder = accent;

        return (
          <>
            <style>{`
              .forma-input {
                width: 100%;
                padding: 14px 16px;
                border-radius: 12px;
                border: 1.5px solid ${inputBorder};
                background: ${inputBg};
                color: ${text};
                font-size: 16px;
                line-height: 1.5;
                outline: none;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
              }
              .forma-input::placeholder { color: ${textFaint}; }
              .forma-input:focus {
                border-color: ${inputFocusBorder};
                box-shadow: 0 0 0 3px ${accent}22;
                background: ${isLightBg ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)'};
              }
              .forma-input:hover:not(:focus) {
                border-color: ${isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'};
              }
              textarea.forma-input { min-height: 130px; resize: vertical; }
            `}</style>
            <div
              className="min-h-screen py-10 px-4 sm:py-16"
              style={{
                background: bg === '#ffffff'
                  ? `linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #fafafa 100%)`
                  : `linear-gradient(135deg, ${bg} 0%, ${bg}ee 50%, ${bg} 100%)`,
              }}
            >
              <div className="max-w-xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="mb-10 text-center"
                >
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: text }}>
                    {form?.name}
                  </h1>
                  {form?.description && (
                    <p className="text-base sm:text-lg leading-relaxed max-w-md mx-auto" style={{ color: textMuted }}>{form.description}</p>
                  )}
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-xl text-red-600"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    {error}
                  </motion.div>
                )}

                {isMultiStep && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-medium" style={{ color: textMuted }}>
                        Step {currentStep + 1} of {totalSteps}
                      </span>
                      <span className="text-sm font-medium" style={{ color: accent }}>
                        {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: textFaint }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: accent }}
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                )}

                <motion.form
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isLastStep) {
                      handleSubmit(e);
                    } else {
                      const shouldSubmit = goToNextPage();
                      if (shouldSubmit) handleSubmit(e);
                    }
                  }}
                  className="rounded-2xl p-6 sm:p-8 space-y-7"
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: cardShadow,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <AnimatePresence mode="sync">
                    {currentPageFields
                      .filter((field) => field.type !== 'hidden' && evaluateCondition(field.condition, formData))
                      .map((field, i) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        className="space-y-2"
                      >
                        <label className="block text-sm font-semibold tracking-wide" style={{ color: text }}>
                          {field.label}
                          {field.required && <span style={{ color: accent }} className="ml-1">*</span>}
                        </label>

                        {renderField(field, formData, handleFieldChange, handleCheckboxChange, handleFileChange)}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className={cn('flex gap-3 pt-2', isMultiStep && currentStep > 0 ? 'justify-between' : 'justify-end')}>
                    {isMultiStep && currentStep > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200"
                        style={{
                          color: textMuted,
                          backgroundColor: inputBg,
                          border: `1.5px solid ${inputBorder}`,
                        }}
                      >
                        <ArrowLeft size={18} />
                        Back
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        'flex-1 px-8 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200',
                        isSubmitting && 'opacity-70 cursor-not-allowed'
                      )}
                      style={{
                        backgroundColor: accent,
                        boxShadow: `0 4px 14px ${accent}40`,
                      }}
                    >
                      {isSubmitting ? (
                        <Spinner size={20} className="animate-spin" />
                      ) : isLastStep ? (
                        'Submit'
                      ) : (
                        <>
                          Next
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>

                {form?.settings?.thankYou?.showBranding !== false && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-10 flex items-center justify-center gap-2 text-sm"
                    style={{ color: textFaint }}
                  >
                    <span>Powered by</span>
                    <Link href="/" className="flex items-center gap-1 font-medium transition-colors hover:opacity-80" style={{ color: accent }}>
                      <Stack size={16} weight="fill" />
                      Forma
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}

function renderField(
  field: FormField,
  formData: Record<string, string | string[]>,
  onChange: (fieldId: string, value: string) => void,
  onCheckboxChange: (fieldId: string, option: string, checked: boolean) => void,
  onFileChange: (fieldId: string, file: File | null) => void
) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
      return (
        <input
          type={field.type === 'phone' ? 'tel' : field.type}
          placeholder={field.placeholder}
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="forma-input"
          required={field.required}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="forma-input"
          required={field.required}
        />
      );
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder}
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="forma-input"
          required={field.required}
        />
      );
    case 'checkbox':
      return (
        <div className="space-y-2.5">
          {(field.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4.5 h-4.5 rounded border-2 border-current/20 accent-current"
                checked={(formData[field.id] as string[] || []).includes(option)}
                onChange={(e) => onCheckboxChange(field.id, option, e.target.checked)}
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-2.5">
          {(field.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name={field.id}
                className="w-4.5 h-4.5 border-2 border-current/20 accent-current"
                checked={formData[field.id] === option}
                onChange={() => onChange(field.id, option)}
                required={field.required && index === 0}
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      );
    case 'select':
      return (
        <select
          className="forma-input"
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
        >
          <option value="">Select an option</option>
          {(field.options || []).map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'file': {
      const fileData = formData[field.id] ? JSON.parse(formData[field.id] as string) : null;
      return (
        <div className="relative">
          {fileData ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-safety-orange/10 flex items-center justify-center">
                <FileIcon size={20} className="text-safety-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fileData.name}</p>
                <p className="text-xs text-gray-500">{(fileData.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => onFileChange(field.id, null)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 hover:border-safety-orange/50 transition-colors cursor-pointer block">
              <UploadSimple size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Click to upload</p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX up to 5MB</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => onFileChange(field.id, e.target.files?.[0] || null)}
                required={field.required}
              />
            </label>
          )}
        </div>
      );
    }
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(field.id, star.toString())}
              className="p-1"
            >
              <Star
                size={32}
                weight={Number(formData[field.id]) >= star ? 'fill' : 'regular'}
                className={cn(
                  'transition-colors',
                  Number(formData[field.id]) >= star
                    ? 'text-yellow-600'
                    : 'text-gray-300 hover:text-yellow-500'
                )}
              />
            </button>
          ))}
        </div>
      );
    case 'image':
      return field.mediaUrl ? (
        <div className="rounded-xl overflow-hidden">
          <img
            src={field.mediaUrl}
            alt={field.label}
            className="w-full h-auto max-h-80 object-cover rounded-xl"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-current/10 p-8 text-center opacity-50">
          <p className="text-sm">No image URL configured</p>
        </div>
      );
    case 'video': {
      const videoUrl = field.mediaUrl || '';
      let embedUrl = '';
      // YouTube
      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      // Vimeo
      const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

      return embedUrl ? (
        <div className="rounded-xl overflow-hidden aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={field.label}
          />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-current/10 p-8 text-center opacity-50">
          <p className="text-sm">No valid video URL configured</p>
        </div>
      );
    }
    case 'payment': {
      const currencySymbols: Record<string, string> = { usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$' };
      const symbol = currencySymbols[field.currency || 'usd'] || '$';
      return (
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-3xl font-bold mb-1">{symbol}{(field.amount || 0).toFixed(2)}</div>
          <p className="text-sm opacity-60 mb-3">{(field.currency || 'usd').toUpperCase()} · One-time payment</p>
          <p className="text-xs opacity-40">Payment will be processed securely via Stripe after submission</p>
          <input type="hidden" name={field.id} value="pending" />
        </div>
      );
    }
    default:
      return null;
  }
}
