'use client';

import { useRef } from 'react';
import { TextB, TextItalic, TextUnderline, LinkSimple, ListBullets } from '@phosphor-icons/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, rows = 5, className = '' }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);

    // Restore cursor position after the wrapped text
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = end + before.length;
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(start);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const buttons = [
    { icon: TextB, label: 'Bold', action: () => wrapSelection('<b>', '</b>') },
    { icon: TextItalic, label: 'Italic', action: () => wrapSelection('<i>', '</i>') },
    { icon: TextUnderline, label: 'Underline', action: () => wrapSelection('<u>', '</u>') },
    { icon: LinkSimple, label: 'Link', action: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const selected = value.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selected) {
        wrapSelection('<a href="URL">', '</a>');
      } else {
        insertAtCursor('<a href="URL">Link text</a>');
      }
    }},
    { icon: ListBullets, label: 'List', action: () => insertAtCursor('\n• ') },
  ];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            title={btn.label}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <btn.icon size={16} weight="bold" />
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 text-sm outline-none resize-y border-none ${className}`}
      />
    </div>
  );
}
