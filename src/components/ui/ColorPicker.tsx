'use client';

/**
 * Branded <ColorPicker>: swatch trigger paired with a hex input, plus an
 * optional palette of quick-pick brand colors. Opens the native `<input
 * type="color">` popover on click so users still get full range without a
 * DIY HSL canvas.
 *
 * Why not just the native picker?
 *   - The native swatch block is tiny and wildly different across OSes.
 *   - Users expect to type a hex next to it; we let them.
 *   - Quick presets (brand / common neutrals) make the common case fast.
 *
 * Graceful fallback: if the user's browser somehow lacks `<input type=
 * "color">`, the hex field still works as a text input.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(input: string): string | null {
  if (!HEX_RE.test(input)) return null;
  let hex = input.startsWith('#') ? input : `#${input}`;
  if (hex.length === 4) {
    // expand #abc → #aabbcc
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toLowerCase();
}

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Short palette of named presets shown under the trigger. */
  presets?: string[];
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

const DEFAULT_PRESETS = [
  '#ef6f2e', // safety-orange
  '#111827', // obsidian
  '#2563eb',
  '#10b981',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
  '#ffffff',
];

export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  disabled,
  id,
  className = '',
  ...rest
}: ColorPickerProps) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string>(value);

  const committed = useMemo(() => normalizeHex(value) ?? '#000000', [value]);

  const commitHex = useCallback(
    (raw: string) => {
      const norm = normalizeHex(raw);
      if (norm) onChange(norm);
    },
    [onChange]
  );

  return (
    <div className={['flex items-center gap-2', className].join(' ')}>
      {/* Swatch button — clicking opens the native color picker. */}
      <button
        type="button"
        disabled={disabled}
        aria-label={rest['aria-label'] ?? 'Pick a color'}
        onClick={() => nativeRef.current?.click()}
        className={[
          'relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.625rem]',
          'border-[1.5px] border-gray-200 transition-all',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-gray-400 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(239,111,46,0.25)]',
        ].join(' ')}
      >
        <span
          className="absolute inset-1 rounded-md border border-black/5"
          style={{ background: committed }}
        />
        {/* Hidden real color input. `opacity-0` keeps it clickable but
            invisible so we can layer our branded swatch on top. */}
        <input
          ref={nativeRef}
          id={id}
          type="color"
          disabled={disabled}
          value={committed}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-hidden="true"
          tabIndex={-1}
        />
      </button>

      {/* Hex text input */}
      <input
        type="text"
        spellCheck={false}
        disabled={disabled}
        value={draft}
        onFocus={() => setDraft(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          commitHex(draft);
          setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitHex(draft);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="input flex-1 text-sm font-mono"
        placeholder="#000000"
        aria-label="Hex color value"
      />

      {/* Preset dots */}
      {presets.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {presets.map((p) => {
            const isActive = normalizeHex(p) === committed;
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onChange(p)}
                aria-label={`Use ${p}`}
                className={[
                  'h-5 w-5 rounded-full border transition-transform',
                  isActive
                    ? 'border-(--accent-100) scale-110'
                    : 'border-gray-300 hover:scale-110',
                  p.toLowerCase() === '#ffffff' ? 'ring-1 ring-gray-200' : '',
                ].join(' ')}
                style={{ background: p }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
