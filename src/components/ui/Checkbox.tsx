'use client';

/**
 * Branded <Checkbox>: replaces `<input type="checkbox">` with a visual that
 * matches our buttons/inputs — safety-orange fill, rounded, inherits focus
 * ring styling.
 *
 * Uses a hidden real input for accessibility + form integration, and paints
 * the box with a sibling <span>. The real input owns all a11y semantics
 * (focus, space-to-toggle, screen reader announcement, form submission).
 *
 * For public respondent forms we deliberately keep native `<input type=
 * "checkbox">` so the respondent's accent-color / OS styling applies.
 */

import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { Check, Minus } from '@phosphor-icons/react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Optional label rendered to the right. Clicking the label toggles. */
  label?: ReactNode;
  /** Secondary help text rendered beneath the label. */
  description?: ReactNode;
  /** Forces indeterminate state (tri-state). */
  indeterminate?: boolean;
  /** sm=14px, md=18px. Default md. */
  size?: 'sm' | 'md';
  /** When true, label wrapper spans full row height (useful in lists). */
  block?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      label,
      description,
      indeterminate = false,
      size = 'md',
      block = false,
      className = '',
      disabled,
      ...rest
    },
    ref
  ) {
    const innerRef = useRef<HTMLInputElement>(null);

    // Merge forwarded ref with our inner ref (so consumers can still access the
    // underlying input while we keep a handle for `indeterminate`).
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') ref(innerRef.current);
      else (ref as React.MutableRefObject<HTMLInputElement | null>).current = innerRef.current;
    }, [ref]);

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const boxSize = size === 'sm' ? 14 : 18;
    const iconSize = size === 'sm' ? 10 : 12;

    return (
      <label
        className={[
          'inline-flex items-start gap-2 select-none',
          block ? 'w-full' : '',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          className,
        ].join(' ')}
      >
        <span className="relative inline-flex shrink-0" style={{ width: boxSize, height: boxSize }}>
          <input
            ref={innerRef}
            type="checkbox"
            disabled={disabled}
            {...rest}
            className="peer absolute inset-0 m-0 h-full w-full cursor-[inherit] appearance-none rounded-[5px] border-[1.5px] border-gray-300 bg-white transition-colors checked:border-(--accent-100) checked:bg-(--accent-100) indeterminate:border-(--accent-100) indeterminate:bg-(--accent-100) focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(239,111,46,0.25)] disabled:bg-gray-100"
          />
          {indeterminate ? (
            <Minus
              size={iconSize}
              weight="bold"
              className="pointer-events-none absolute inset-0 m-auto text-white opacity-100"
            />
          ) : (
            <Check
              size={iconSize}
              weight="bold"
              className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
            />
          )}
        </span>
        {(label || description) && (
          <span className="min-w-0 flex-1 leading-tight">
            {label && (
              <span
                className={[
                  'block text-gray-800',
                  size === 'sm' ? 'text-xs' : 'text-sm',
                ].join(' ')}
              >
                {label}
              </span>
            )}
            {description && (
              <span className="mt-0.5 block text-xs text-gray-500">
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  }
);
