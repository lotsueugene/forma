'use client';

/**
 * Branded <Select>: a drop-in replacement for native <select> that matches
 * our `.input` styling and brand (safety-orange accents).
 *
 * Why not native?
 *   - The OS-native dropdown panel ignores our type scale and theme
 *     entirely, and on wide containers the panel stretches to the input
 *     width which looks off in dense dashboards.
 *
 * Where native still wins (and we keep it):
 *   - Public form renderers (`FormPageClient`, `BookingPageClient`). On
 *     mobile, respondents get the OS picker wheel which is easier to use
 *     than a custom popover, and screen readers have deep native support
 *     for <select>. So respondent inputs stay native on purpose.
 *
 * API is deliberately close to a native select so migrating call sites is
 * nearly mechanical:
 *     <Select
 *       value={role}
 *       onChange={(v) => setRole(v)}
 *       options={[
 *         { value: 'owner', label: 'Owner' },
 *         { value: 'viewer', label: 'Viewer' },
 *       ]}
 *       placeholder="Pick a role"
 *     />
 *
 * Accessibility:
 *   - WAI-ARIA listbox pattern (button trigger + listbox popup).
 *   - Full keyboard: ArrowUp/Down/Home/End/Enter/Space/Escape, type-ahead.
 *   - Proper focus return to trigger on close.
 *   - `aria-activedescendant` for visible focus without moving real focus.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional secondary text shown beneath the label. */
  description?: string;
  /** Optional icon rendered to the left of the label inside the menu. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Extra classes appended to the trigger. Lets callers keep e.g. `flex-1`. */
  className?: string;
  /** Compact variant — 32px height. Default is 44px to match `.input`. */
  size?: 'sm' | 'md';
  /** aria-label for the trigger when there isn't a visible <label>. */
  'aria-label'?: string;
  /** Optional icon in the trigger (e.g. a funnel on a filter select). */
  leftIcon?: ReactNode;
  /** Called when the menu closes. Helpful for running validators. */
  onBlur?: () => void;
  id?: string;
  name?: string;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  placement: 'below' | 'above';
}

const OpenMenuCtx = createContext<{ close: () => void } | null>(null);

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  className = '',
  size = 'md',
  leftIcon,
  onBlur,
  id,
  name,
  ...rest
}: SelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const typeaheadRef = useRef<{ buffer: string; lastAt: number }>({ buffer: '', lastAt: 0 });
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const enabledIdxs = useMemo(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [options]
  );

  const close = useCallback(() => {
    setOpen(false);
    setMenuPos(null);
    setActiveIdx(-1);
    onBlur?.();
  }, [onBlur]);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuMaxHeight = 320;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement: MenuPos['placement'] =
      spaceBelow < Math.min(menuMaxHeight + gap, 220) && spaceAbove > spaceBelow
        ? 'above'
        : 'below';
    setMenuPos({
      top:
        placement === 'below'
          ? rect.bottom + gap
          : rect.top - gap, // `transform: translateY(-100%)` applied in menu
      left: rect.left,
      width: rect.width,
      placement,
    });
  }, []);

  // Keep menu anchored while window scrolls/resizes.
  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    const onReflow = () => computePosition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, computePosition]);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        listRef.current?.contains(t)
      ) {
        return;
      }
      close();
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [open, close]);

  // Scroll the active option into view as the user navigates.
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx]);

  const commit = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      if (opt.value !== value) onChange(opt.value);
      close();
      triggerRef.current?.focus();
    },
    [options, value, onChange, close]
  );

  const openWith = useCallback((target: 'first' | 'last' | 'selected' = 'selected') => {
    if (disabled) return;
    // Decide focused option *before* we flip `open` so the listbox opens with
    // the right aria-activedescendant on the very first paint. Doing this in
    // an effect would cause a cascading render + flicker.
    let idx: number;
    if (target === 'first') {
      idx = enabledIdxs[0] ?? -1;
    } else if (target === 'last') {
      idx = enabledIdxs[enabledIdxs.length - 1] ?? -1;
    } else {
      const selectedIdx = options.findIndex((o) => o.value === value && !o.disabled);
      idx = selectedIdx >= 0 ? selectedIdx : enabledIdxs[0] ?? -1;
    }
    setActiveIdx(idx);
    setOpen(true);
  }, [disabled, enabledIdxs, options, value]);

  const moveActive = useCallback((dir: 1 | -1) => {
    setActiveIdx((cur) => {
      if (enabledIdxs.length === 0) return -1;
      const curPos = enabledIdxs.indexOf(cur);
      if (curPos === -1) return dir === 1 ? enabledIdxs[0] : enabledIdxs[enabledIdxs.length - 1];
      const nextPos = (curPos + dir + enabledIdxs.length) % enabledIdxs.length;
      return enabledIdxs[nextPos];
    });
  }, [enabledIdxs]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openWith('selected');
        else moveActive(e.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
        if (open) { e.preventDefault(); setActiveIdx(enabledIdxs[0] ?? -1); }
        break;
      case 'End':
        if (open) { e.preventDefault(); setActiveIdx(enabledIdxs[enabledIdxs.length - 1] ?? -1); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) openWith('selected');
        else if (activeIdx >= 0) commit(activeIdx);
        break;
      case 'Escape':
        if (open) { e.preventDefault(); close(); }
        break;
      case 'Tab':
        if (open) close();
        break;
      default:
        // type-ahead: jump to the first option whose label starts with the buffer
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          const ta = typeaheadRef.current;
          if (now - ta.lastAt > 500) ta.buffer = '';
          ta.buffer += e.key.toLowerCase();
          ta.lastAt = now;
          const match = options.findIndex(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(ta.buffer)
          );
          if (match >= 0) {
            if (!open) openWith();
            setActiveIdx(match);
          }
        }
    }
  };

  const sizeClass =
    size === 'sm'
      ? 'h-8 text-xs px-2.5'
      : 'h-11 text-sm px-3.5';

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-disabled={disabled || undefined}
        aria-activedescendant={
          open && activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
        }
        aria-label={rest['aria-label']}
        disabled={disabled}
        onClick={() => (open ? close() : openWith('selected'))}
        onKeyDown={onTriggerKeyDown}
        className={[
          'w-full inline-flex items-center justify-between gap-2',
          'rounded-[0.625rem] border-[1.5px] bg-white text-left',
          'font-mono', // matches `.input` which uses Geist Mono Custom
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'border-(--accent-100) shadow-[0_0_0_3px_rgba(239,111,46,0.12)]'
            : 'border-gray-200 hover:border-gray-400 focus:border-(--accent-100) focus:shadow-[0_0_0_3px_rgba(239,111,46,0.12)]',
          'focus:outline-none transition-[border-color,box-shadow] duration-150',
          sizeClass,
          className,
        ].join(' ')}
      >
        {leftIcon && <span className="shrink-0 text-gray-500">{leftIcon}</span>}
        <span
          className={[
            'min-w-0 flex-1 truncate',
            selected ? 'text-gray-900' : 'text-gray-400',
          ].join(' ')}
        >
          {selected ? selected.label : placeholder}
        </span>
        <CaretDown
          size={14}
          className={[
            'shrink-0 text-gray-500 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          weight="bold"
        />
      </button>

      {open && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <OpenMenuCtx.Provider value={{ close }}>
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                tabIndex={-1}
                className={[
                  'fixed z-60 min-w-40 max-h-80 overflow-auto',
                  'rounded-[0.625rem] border border-gray-200 bg-white shadow-lg',
                  'py-1 outline-none',
                ].join(' ')}
                style={{
                  top: menuPos.top,
                  left: menuPos.left,
                  width: Math.max(menuPos.width, 160),
                  transform:
                    menuPos.placement === 'above'
                      ? 'translateY(-100%)'
                      : undefined,
                }}
                onKeyDown={(e) => {
                  // Delegate to the same handler as the trigger so keyboard
                  // nav works even when focus has migrated to the list.
                  onTriggerKeyDown(e as unknown as React.KeyboardEvent<HTMLButtonElement>);
                }}
              >
                {options.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-400">No options</li>
                ) : (
                  options.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    const isActive = idx === activeIdx;
                    return (
                      <li
                        key={opt.value + idx}
                        id={`${listboxId}-opt-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled || undefined}
                        onPointerEnter={() => !opt.disabled && setActiveIdx(idx)}
                        onClick={() => commit(idx)}
                        className={[
                          'flex items-start gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                          opt.disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : isActive
                            ? 'bg-[rgba(239,111,46,0.08)] text-gray-900'
                            : 'text-gray-700',
                        ].join(' ')}
                      >
                        {opt.icon && (
                          <span className="shrink-0 mt-0.5 text-gray-500">{opt.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[11px] text-gray-500 truncate">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        {isSelected && !opt.disabled && (
                          <Check
                            size={14}
                            weight="bold"
                            className="shrink-0 mt-1 text-(--accent-100)"
                          />
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </OpenMenuCtx.Provider>,
            document.body
          )
        : null}
    </>
  );
}

/** Hook usable from inside an option's custom render to programmatically close. */
export function useCloseSelect() {
  return useContext(OpenMenuCtx)?.close;
}
