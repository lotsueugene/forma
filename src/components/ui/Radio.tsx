'use client';

/**
 * Branded <RadioGroup>: replaces stacks of `<input type="radio">` with an
 * accessible, visually-consistent radio set that matches our inputs.
 *
 * Uses the WAI-ARIA radiogroup pattern:
 *   - Arrow keys move focus + selection within the group
 *   - Tab moves focus into/out of the group (landing on the checked radio)
 *   - Space/Enter selects the focused radio
 *
 * Call sites:
 *     <RadioGroup
 *       value={plan}
 *       onChange={setPlan}
 *       options={[
 *         { value: 'monthly', label: 'Monthly', description: '$29 / mo' },
 *         { value: 'yearly',  label: 'Yearly',  description: '$290 / yr' },
 *       ]}
 *     />
 *
 * Like the other branded inputs, we keep native `<input type="radio">` for
 * public respondent forms where the OS styling is desirable.
 */

import { useRef, type ReactNode } from 'react';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  name?: string;
  /** Stacked (default) or inline (horizontal). */
  orientation?: 'vertical' | 'horizontal';
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  value,
  onChange,
  options,
  name,
  orientation = 'vertical',
  disabled,
  className = '',
  ...rest
}: RadioGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const focusable = options.filter((o) => !o.disabled);

  const moveSelection = (dir: 1 | -1, fromValue: string) => {
    if (focusable.length === 0) return;
    const curIdx = focusable.findIndex((o) => o.value === fromValue);
    const nextIdx = curIdx === -1
      ? 0
      : (curIdx + dir + focusable.length) % focusable.length;
    const next = focusable[nextIdx];
    onChange(next.value);
    // Move DOM focus to the newly-selected radio so screen readers announce it.
    requestAnimationFrame(() => {
      const el = groupRef.current?.querySelector<HTMLElement>(
        `[data-radio-value="${CSS.escape(next.value)}"]`
      );
      el?.focus();
    });
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={rest['aria-label']}
      aria-labelledby={rest['aria-labelledby']}
      aria-disabled={disabled || undefined}
      className={[
        'flex',
        orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap gap-3',
        className,
      ].join(' ')}
    >
      {options.map((opt) => {
        const checked = opt.value === value;
        const isDisabled = disabled || opt.disabled;
        return (
          <label
            key={opt.value}
            className={[
              'inline-flex items-start gap-2 select-none',
              isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            ].join(' ')}
          >
            <span
              // The visual bullet. We stack a tab-stoppable input inside so
              // keyboard/screen-reader semantics stay native.
              className={[
                'relative inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center',
                'mt-0.5 rounded-full border-[1.5px] bg-white transition-colors',
                checked ? 'border-(--accent-100)' : 'border-gray-300 hover:border-gray-400',
              ].join(' ')}
            >
              <input
                type="radio"
                data-radio-value={opt.value}
                name={name}
                value={opt.value}
                checked={checked}
                disabled={isDisabled}
                onChange={() => onChange(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    moveSelection(1, opt.value);
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    moveSelection(-1, opt.value);
                  }
                }}
                // Make only the selected radio reachable by Tab (roving tabindex).
                tabIndex={checked || (!focusable.some((o) => o.value === value) && opt === focusable[0]) ? 0 : -1}
                className="absolute inset-0 m-0 h-full w-full cursor-[inherit] appearance-none rounded-full opacity-0 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(239,111,46,0.25)]"
                aria-describedby={opt.description ? undefined : undefined}
              />
              <span
                className={[
                  'pointer-events-none h-2 w-2 rounded-full transition-transform',
                  checked ? 'scale-100 bg-(--accent-100)' : 'scale-0 bg-transparent',
                ].join(' ')}
              />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm text-gray-800">{opt.label}</span>
              {opt.description && (
                <span className="mt-0.5 block text-xs text-gray-500">{opt.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
