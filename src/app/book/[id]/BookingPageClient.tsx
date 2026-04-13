'use client';

import { useState, useEffect } from 'react';
import { Spinner, Check, UploadSimple, Star, File as FileIcon, X } from '@phosphor-icons/react';
import BookingField from '@/components/forms/BookingField';
import Link from 'next/link';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  amount?: number;
  currency?: string;
  bookingMode?: 'custom' | 'fixed';
  slotDuration?: number;
  weeklySchedule?: Record<number, Array<{ start: string; end: string }>>;
  availabilityEnabled?: boolean;
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

export default function BookingPageClient({ formId }: { formId: string }) {
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [hasBookingSelected, setHasBookingSelected] = useState(false);

  // Fetch form data
  useEffect(() => {
    fetch(`/api/public/forms/${formId}`)
      .then(res => {
        if (!res.ok) throw new Error('Form not found');
        return res.json();
      })
      .then(data => {
        setForm(data.form);
      })
      .catch(() => setError('This booking link is no longer available.'))
      .finally(() => setIsLoading(false));
  }, [formId]);

  // Find the booking field and non-booking fields
  const bookingField = form?.fields.find(f => f.type === 'booking');
  const otherFields = form?.fields.filter(f =>
    f.type !== 'booking' && f.type !== 'payment' && f.type !== 'page_break' && f.type !== 'hidden'
  ) || [];

  const accent = form?.settings?.branding?.accentColor || '#ef6f2e';
  const bgColor = form?.settings?.branding?.backgroundColor || '#ffffff';
  const textColor = form?.settings?.branding?.textColor || '#111827';
  const isLightBg = isLightColor(bgColor);

  const handleChange = (fieldId: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleBookingChange = (value: string) => {
    if (bookingField) {
      setFormData(prev => ({ ...prev, [bookingField.id]: value }));
      setHasBookingSelected(!!value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const field of otherFields) {
      if (field.required && !formData[field.id]) {
        setError(`Please fill in "${field.label}"`);
        return;
      }
    }

    if (bookingField?.required && !formData[bookingField.id]) {
      setError('Please select a time slot');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to submit booking');
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Spinner size={28} className="animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!form || !bookingField) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">This form doesn&apos;t have a booking field.</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const thankYou = form.settings?.thankYou;
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${accent}15` }}
          >
            <Check size={32} style={{ color: accent }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: textColor }}>
            {thankYou?.heading || 'Booking Confirmed!'}
          </h2>
          <p className="text-sm" style={{ color: `${textColor}88` }}>
            {thankYou?.message || 'Your booking has been submitted successfully. You will receive a confirmation shortly.'}
          </p>
          {thankYou?.showBranding !== false && (
            <p className="text-xs pt-4" style={{ color: `${textColor}33` }}>
              Powered by{' '}
              <Link href="https://withforma.io" className="underline" target="_blank">Forma</Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: bgColor }}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>
            {form.name}
          </h1>
          {form.description && (
            <p className="text-sm" style={{ color: `${textColor}77` }}>
              {form.description}
            </p>
          )}
        </div>

        {/* Step 1: Booking calendar — always visible */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              1
            </span>
            <h2 className="text-sm font-semibold" style={{ color: textColor }}>
              {bookingField.label || 'Select a Time'}
            </h2>
          </div>
          <BookingField
            formId={formId}
            fieldId={bookingField.id}
            value={formData[bookingField.id] as string}
            onChange={handleBookingChange}
            required={bookingField.required}
            accent={accent}
            textColor={textColor}
            isLightBg={isLightBg}
            bookingMode={bookingField.bookingMode}
            slotDuration={bookingField.slotDuration}
            weeklySchedule={bookingField.weeklySchedule}
            availabilityEnabled={bookingField.availabilityEnabled}
          />
        </div>

        {/* Step 2: Other fields — shown after booking is selected */}
        {hasBookingSelected && otherFields.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                2
              </span>
              <h2 className="text-sm font-semibold" style={{ color: textColor }}>
                Your Details
              </h2>
            </div>

            <div className="space-y-4">
              {otherFields.map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: textColor }}>
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                  {renderField(field, formData, handleChange, accent, textColor, isLightBg, formId)}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: accent }}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </form>
        )}

        {/* Show submit button even if no other fields */}
        {hasBookingSelected && otherFields.length === 0 && (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: accent }}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        )}

        {/* Powered by */}
        <p className="text-center text-xs pt-2" style={{ color: `${textColor}33` }}>
          Powered by{' '}
          <Link href="https://withforma.io" className="underline" target="_blank">Forma</Link>
        </p>
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function renderField(
  field: FormField,
  formData: Record<string, string | string[]>,
  onChange: (id: string, value: string | string[]) => void,
  accent: string,
  textColor: string,
  isLightBg: boolean,
  formId: string,
) {
  const inputStyle = {
    backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
    border: `1.5px solid ${isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
    color: textColor,
  };

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'number':
    case 'date':
      return (
        <input
          type={field.type === 'phone' ? 'tel' : field.type}
          placeholder={field.placeholder || ''}
          value={(formData[field.id] as string) || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
          style={{ ...inputStyle, '--tw-ring-color': accent } as React.CSSProperties}
        />
      );

    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder || ''}
          value={(formData[field.id] as string) || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 resize-none"
          style={{ ...inputStyle, '--tw-ring-color': accent } as React.CSSProperties}
        />
      );

    case 'select':
      return (
        <select
          value={(formData[field.id] as string) || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
          style={{ ...inputStyle, '--tw-ring-color': accent } as React.CSSProperties}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer text-sm" style={{ color: textColor }}>
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={(formData[field.id] as string) === opt}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-4 h-4"
                style={{ accentColor: accent }}
              />
              {opt}
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map(opt => {
            const selected = (formData[field.id] as string[] | undefined) || [];
            return (
              <label key={opt} className="flex items-center gap-3 cursor-pointer text-sm" style={{ color: textColor }}>
                <input
                  type="checkbox"
                  value={opt}
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const current = [...selected];
                    if (e.target.checked) {
                      current.push(opt);
                    } else {
                      const idx = current.indexOf(opt);
                      if (idx > -1) current.splice(idx, 1);
                    }
                    onChange(field.id, current);
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: accent }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );

    case 'rating': {
      const currentRating = parseInt((formData[field.id] as string) || '0');
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(field.id, String(star))}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={28}
                weight={star <= currentRating ? 'fill' : 'regular'}
                style={{ color: star <= currentRating ? accent : `${textColor}30` }}
              />
            </button>
          ))}
        </div>
      );
    }

    case 'file': {
      const fileValue = formData[field.id] as string;
      if (fileValue) {
        const fileName = fileValue.split('/').pop() || 'File uploaded';
        return (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
            <FileIcon size={16} style={{ color: accent }} />
            <span className="flex-1 truncate" style={{ color: textColor }}>{fileName}</span>
            <button type="button" onClick={() => onChange(field.id, '')} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        );
      }
      return (
        <label
          className="flex items-center justify-center gap-2 px-4 py-6 rounded-xl text-sm cursor-pointer transition-all hover:opacity-80 border-2 border-dashed"
          style={{
            borderColor: isLightBg ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
            color: `${textColor}66`,
          }}
        >
          <UploadSimple size={18} />
          <span>Click to upload</span>
          <input
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              fd.append('formId', formId);
              try {
                const res = await fetch('/api/upload/public', { method: 'POST', body: fd });
                if (res.ok) {
                  const data = await res.json();
                  onChange(field.id, data.url);
                }
              } catch { /* ignore */ }
            }}
          />
        </label>
      );
    }

    default:
      return null;
  }
}
