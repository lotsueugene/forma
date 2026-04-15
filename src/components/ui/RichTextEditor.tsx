'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextB, TextItalic, TextUnderline, LinkSimple, ListBullets, ListNumbers } from '@phosphor-icons/react';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, rows = 5 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-safety-orange underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Type your message...',
      }),
    ],
    // Convert plain text \n to <br> for existing content
    content: (value && !value.includes('<')) ? value.replace(/\n/g, '<br>') : (value || ''),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none px-4 py-3 outline-none text-sm text-gray-900`,
        style: `min-height: ${rows * 1.5}rem`,
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      const content = (value && !value.includes('<')) ? value.replace(/\n/g, '<br>') : (value || '');
      editor.commands.setContent(content);
    }
  }, [value, editor]);

  if (!editor) return null;

  const buttons = [
    {
      icon: TextB,
      label: 'Bold',
      active: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: TextItalic,
      label: 'Italic',
      active: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: TextUnderline,
      label: 'Underline',
      active: editor.isActive('underline'),
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      icon: LinkSimple,
      label: 'Link',
      active: editor.isActive('link'),
      action: () => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt('Enter URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }
      },
    },
    {
      icon: ListBullets,
      label: 'Bullet List',
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListNumbers,
      label: 'Numbered List',
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-100">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            title={btn.label}
            className={`p-1.5 rounded-md transition-colors ${
              btn.active
                ? 'bg-safety-orange/10 text-safety-orange'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <btn.icon size={16} weight={btn.active ? 'bold' : 'regular'} />
          </button>
        ))}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .tiptap {
          min-height: ${rows * 1.5}rem;
        }
        .tiptap p { margin: 0.25em 0; }
        .tiptap ul, .tiptap ol { padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap li { margin: 0.15em 0; }
        .tiptap a { color: #ef6f2e; text-decoration: underline; }
      `}</style>
    </div>
  );
}
