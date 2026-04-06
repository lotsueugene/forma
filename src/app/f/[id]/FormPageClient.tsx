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
  const getPages = (fields: FormField[]): FormField[][] => {
    const pages: FormField[][] = [];
    let currentPage: FormField[] = [];

    fields.forEach((field) => {
      if (field.type === 'page_break') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
        }
      } else {
        currentPage.push(field);
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
  };

  const pages = form ? getPages(form.fields) : [[]];
  const totalSteps = pages.length;
  const isMultiStep = totalSteps > 1;
  const isLastStep = currentStep === totalSteps - 1;
  const currentPageFields = pages[currentStep] || [];

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

      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: form?.settings?.branding?.backgroundColor || '#ffffff' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-semibold mb-2" style={{ color: form?.settings?.branding?.textColor || '#111827' }}>
              {form?.name}
            </h1>
            {form?.description && (
              <p style={{ color: form?.settings?.branding?.textColor ? `${form.settings.branding.textColor}99` : '#4b5563' }}>{form.description}</p>
            )}
          </motion.div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {isMultiStep && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: form?.settings?.branding?.textColor ? `${form.settings.branding.textColor}99` : '#4b5563' }}>
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-sm" style={{ color: form?.settings?.branding?.textColor ? `${form.settings.branding.textColor}99` : '#4b5563' }}>
                  {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: form?.settings?.branding?.textColor ? `${form.settings.branding.textColor}20` : '#e5e7eb' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: form?.settings?.branding?.accentColor || 'var(--accent-100)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (isLastStep) {
                handleSubmit(e);
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            }}
            className="rounded-xl border p-6 space-y-6"
            style={{
              backgroundColor: form?.settings?.branding?.backgroundColor || '#ffffff',
              borderColor: form?.settings?.branding?.textColor ? `${form.settings.branding.textColor}15` : '#e5e7eb',
              color: form?.settings?.branding?.textColor || undefined,
            }}
          >
            <AnimatePresence mode="sync">
              {currentPageFields
                .filter((field) => field.type !== 'hidden' && evaluateCondition(field.condition, formData))
                .map((field) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="form-field overflow-hidden"
                >
                  <label className="form-label" style={{ color: form?.settings?.branding?.textColor || undefined }}>
                    {field.label}
                    {field.required && <span className="text-red-600 ml-1">*</span>}
                  </label>

                  {renderField(field, formData, handleFieldChange, handleCheckboxChange, handleFileChange)}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className={cn('flex gap-3', isMultiStep && currentStep > 0 ? 'justify-between' : 'justify-end')}>
              {isMultiStep && currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'btn btn-primary flex-1 justify-center flex items-center gap-2',
                  isSubmitting && 'opacity-70 cursor-not-allowed'
                )}
                style={form?.settings?.branding?.accentColor ? { backgroundColor: form.settings.branding.accentColor, borderColor: form.settings.branding.accentColor } : undefined}
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
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Powered by</span>
            <Link href="/" className="flex items-center gap-1 text-safety-orange hover:text-safety-orange/80">
              <Stack size={16} weight="fill" />
              Forma
            </Link>
          </div>
          )}
        </div>
      </div>
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
          className="input"
          required={field.required}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="input"
          required={field.required}
        />
      );
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder}
          value={formData[field.id] as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="input min-h-[120px]"
          required={field.required}
        />
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {(field.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={(formData[field.id] as string[] || []).includes(option)}
                onChange={(e) => onCheckboxChange(field.id, option, e.target.checked)}
              />
              {option}
            </label>
          ))}
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                className="border-gray-300"
                checked={formData[field.id] === option}
                onChange={() => onChange(field.id, option)}
                required={field.required && index === 0}
              />
              {option}
            </label>
          ))}
        </div>
      );
    case 'select':
      return (
        <select
          className="input"
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
    default:
      return null;
  }
}
