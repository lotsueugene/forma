'use client';

import { useState, useRef } from 'react';

interface TimeInputProps {
  value: string; // "09:00" (24h format)
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

function to12h(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function to24h(display: string): string | null {
  const cleaned = display.trim().toUpperCase();

  // Try parsing "5:45 PM", "5:45PM", "17:45", "5:45 pm", "545pm" etc.
  const match = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;

  let h = parseInt(match[1]);
  const m = parseInt(match[2] || '0');
  const period = match[3];

  if (m < 0 || m > 59) return null;

  if (period) {
    if (h < 1 || h > 12) return null;
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h !== 12) h += 12;
  } else {
    if (h < 0 || h > 23) return null;
  }

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function TimeInput({ value, onChange, className = '', style, placeholder = 'e.g. 9:00 AM' }: TimeInputProps) {
  const [display, setDisplay] = useState(to12h(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally
  const displayValue = focused ? display : to12h(value);

  const handleFocus = () => {
    setDisplay(to12h(value));
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = to24h(display);
    if (parsed) {
      onChange(parsed);
      setDisplay(to12h(parsed));
    } else if (display.trim() === '') {
      onChange('');
    } else {
      // Invalid — revert to current value
      setDisplay(to12h(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={(e) => setDisplay(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      style={style}
      autoComplete="off"
    />
  );
}
