'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  TextT,
  EnvelopeSimple,
  Phone,
  TextAlignLeft,
  CalendarBlank,
  CheckSquare,
  RadioButton,
  CaretDown as CaretDownIcon,
  UploadSimple,
  Star,
  Hash,
  Link as LinkIcon,
  Trash,
  Copy,
  DotsSixVertical,
  Eye,
  FloppyDisk,
  Rocket,
  X,
  GitBranch,
  ArrowsDownUp,
  Sparkle,
  Spinner,
  EyeSlash,
  Gear,
  Palette,
  CheckCircle,
  Image as ImageIcon,
  VideoCamera,
  CreditCard,
} from '@phosphor-icons/react';
import { cn, generateId } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';

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

type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'file'
  | 'rating'
  | 'url'
  | 'page_break'
  | 'hidden'
  | 'image'
  | 'video'
  | 'payment';

type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';

interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

interface FormField {
  id: string;
  type: FieldType;
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

const fieldTypes: { type: FieldType; label: string; icon: typeof TextT }[] = [
  { type: 'text', label: 'Short Text', icon: TextT },
  { type: 'email', label: 'Email', icon: EnvelopeSimple },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'textarea', label: 'Long Text', icon: TextAlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: CalendarBlank },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { type: 'radio', label: 'Radio Buttons', icon: RadioButton },
  { type: 'select', label: 'Dropdown', icon: CaretDownIcon },
  { type: 'file', label: 'File Upload', icon: UploadSimple },
  { type: 'rating', label: 'Rating', icon: Star },
  { type: 'url', label: 'URL', icon: LinkIcon },
  { type: 'page_break', label: 'Page Break', icon: ArrowsDownUp },
  { type: 'hidden', label: 'Hidden Field', icon: EyeSlash },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Video', icon: VideoCamera },
  { type: 'payment', label: 'Payment', icon: CreditCard },
];

const getDefaultLabel = (type: FieldType) => {
  const labels: Record<FieldType, string> = {
    text: 'Text Field',
    email: 'Email Address',
    phone: 'Phone Number',
    textarea: 'Message',
    number: 'Number',
    date: 'Date',
    checkbox: 'Checkboxes',
    radio: 'Choose One',
    select: 'Select Option',
    file: 'Upload File',
    rating: 'Rating',
    url: 'Website URL',
    page_break: 'Page Break',
    hidden: 'Hidden Field',
    image: 'Image',
    video: 'Video',
    payment: 'Payment',
  };
  return labels[type];
};

// Draggable field item component with proper drag handle
function DraggableFieldItem({
  field,
  index,
  fields,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  field: FormField;
  index: number;
  fields: FormField[];
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={field}
      dragListener={false}
      dragControls={dragControls}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        zIndex: 50,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      style={{ position: 'relative' }}
      className={cn(
        (['page_break', 'hidden', 'image', 'video'].includes(field.type))
          ? 'relative py-2'
          : 'card p-4',
        !['page_break', 'hidden', 'image', 'video'].includes(field.type) && (
          isSelected
            ? 'ring-2 ring-safety-orange border-transparent'
            : 'hover:border-gray-300'
        )
      )}
      onClick={onSelect}
    >
      {(field.type === 'image' || field.type === 'video') ? (
        <div className={cn(
          'flex items-center gap-3 py-2 px-4 rounded-lg border-2 border-dashed transition-all',
          isSelected ? 'border-safety-orange bg-safety-orange/5' : 'border-gray-300 hover:border-gray-400'
        )}>
          <div onPointerDown={(e) => dragControls.start(e)} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none">
            <DotsSixVertical size={20} />
          </div>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            {field.type === 'image' ? <ImageIcon size={18} className="text-blue-500 shrink-0" /> : <VideoCamera size={18} className="text-purple-500 shrink-0" />}
            <span className="text-sm font-medium text-gray-600">{field.label}</span>
            {field.mediaUrl && <span className="text-xs text-gray-400 truncate">{field.mediaUrl}</span>}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100" title="Delete">
            <Trash size={16} />
          </button>
        </div>
      ) : field.type === 'hidden' ? (
        <div className={cn(
          'flex items-center gap-3 py-2 px-4 rounded-lg border-2 border-dashed transition-all',
          isSelected
            ? 'border-safety-orange bg-safety-orange/5'
            : 'border-gray-300 hover:border-gray-400'
        )}>
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          >
            <DotsSixVertical size={20} />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <EyeSlash size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{field.label}</span>
            {field.defaultValue && (
              <span className="text-xs text-gray-400">= {field.defaultValue.startsWith('{{') ? field.defaultValue : `"${field.defaultValue}"`}</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
            title="Delete"
          >
            <Trash size={16} />
          </button>
        </div>
      ) : field.type === 'page_break' ? (
        /* Page Break Divider */
        <div className={cn(
          'flex items-center gap-3 py-2 px-4 rounded-lg border-2 border-dashed transition-all',
          isSelected
            ? 'border-safety-orange bg-safety-orange/5'
            : 'border-gray-300 hover:border-gray-400'
        )}>
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          >
            <DotsSixVertical size={20} />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <ArrowsDownUp size={18} className="text-safety-orange" />
            <span className="text-sm font-medium text-gray-600">
              Page {fields.slice(0, index).filter(f => f.type === 'page_break').length + 2} starts here
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
            title="Delete"
          >
            <Trash size={16} />
          </button>
        </div>
      ) : (
        /* Regular Field */
        <div className="flex items-start gap-3">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="pt-1 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-600 touch-none"
          >
            <DotsSixVertical size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">
                {field.label}
              </span>
              {field.required && (
                <span className="text-red-500 text-sm">*</span>
              )}
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {field.type}
              </span>
              {field.condition && (
                <span className="text-xs text-safety-orange bg-safety-orange/10 px-2 py-0.5 rounded flex items-center gap-1">
                  <GitBranch size={10} />
                  Conditional
                </span>
              )}
            </div>
            {/* Field Preview */}
            <FieldPreview field={field} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100"
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-500 hover:text-red-500 rounded hover:bg-gray-100"
              title="Delete"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
}

export default function NewFormPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [formName, setFormName] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([
    {
      id: generateId(),
      type: 'text',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      required: true,
    },
    {
      id: generateId(),
      type: 'email',
      label: 'Email Address',
      placeholder: 'you@example.com',
      required: true,
    },
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formSettings, setFormSettings] = useState<FormSettings>({});
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [planType, setPlanType] = useState<string>('free');

  // Fetch workspace plan
  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/workspaces/${currentWorkspace.id}/subscription`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.subscription?.plan) setPlanType(data.subscription.plan); })
      .catch(() => {});
  }, [currentWorkspace]);

  const fieldPickerRef = useRef<HTMLDivElement>(null);
  const aiModalRef = useRef<HTMLDivElement>(null);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate form');
        return;
      }

      // Update form with AI-generated content
      setFormName(data.name);
      setFields(data.fields);
      setShowAIModal(false);
      setAIPrompt('');
    } catch (err) {
      setError('Failed to generate form. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Close field picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(event.target as Node)) {
        setShowFieldPicker(false);
      }
    }

    if (showFieldPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFieldPicker]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: getDefaultLabel(type),
      placeholder: '',
      required: false,
      options:
        type === 'checkbox' || type === 'radio' || type === 'select'
          ? ['Option 1', 'Option 2', 'Option 3']
          : undefined,
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setShowFieldPicker(false);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const duplicateField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (field) {
      const index = fields.findIndex((f) => f.id === id);
      const newField = { ...field, id: generateId() };
      const newFields = [...fields];
      newFields.splice(index + 1, 0, newField);
      setFields(newFields);
      setSelectedFieldId(newField.id);
    }
  };

  const handleSave = async (status: 'draft' | 'active' = 'draft') => {
    const isPublish = status === 'active';
    if (isPublish) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }
    setError('');

    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          fields,
          status,
          settings: formSettings,
          workspaceId: currentWorkspace?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save form');
        return;
      }

      // Redirect to form detail page to show endpoint
      router.push(`/dashboard/forms/${data.form.id}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col -m-4 lg:-m-6">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 lg:px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link
            href="/dashboard/forms"
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-base sm:text-lg font-medium text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-safety-orange transition-colors min-w-0 flex-1 truncate"
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {error && (
            <span className="text-red-600 text-sm mr-2 hidden sm:block">{error}</span>
          )}
          <button
            onClick={() => { setShowFormSettings(true); setSelectedFieldId(null); }}
            className={cn(
              'btn btn-secondary px-2 sm:px-3',
              showFormSettings && 'ring-2 ring-safety-orange'
            )}
            title="Form Settings"
          >
            <Gear size={18} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            className="btn btn-secondary bg-safety-orange/10 border-safety-orange/30 text-safety-orange hover:bg-safety-orange/20 px-2 sm:px-3 hidden sm:flex"
            title="AI Generate"
          >
            <Sparkle size={18} weight="fill" />
            <span className="hidden md:inline">AI Generate</span>
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={isSaving || isPublishing}
            className="btn btn-secondary px-2 sm:px-3 hidden sm:flex"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <FloppyDisk size={18} weight="bold" />
            )}
            <span className="hidden md:inline">Save Draft</span>
          </button>
          <button
            onClick={() => handleSave('active')}
            disabled={isSaving || isPublishing}
            className="btn btn-primary px-2 sm:px-3"
          >
            {isPublishing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Rocket size={18} weight="bold" />
            )}
            <span className="hidden sm:inline">Publish</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Form Builder Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Form Header */}
            <div className="mb-6 sm:mb-8">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-2xl sm:text-3xl font-semibold text-gray-900 bg-transparent outline-none w-full mb-2"
                placeholder="Form Title"
              />
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-sm sm:text-base text-gray-500 bg-transparent outline-none w-full"
                placeholder="Add a description (optional)"
              />
            </div>

            {/* Fields */}
            <Reorder.Group
              axis="y"
              values={fields}
              onReorder={setFields}
              className="space-y-4"
            >
              {fields.map((field, index) => (
                <DraggableFieldItem
                  key={field.id}
                  field={field}
                  index={index}
                  fields={fields}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => { setSelectedFieldId(field.id); setShowFormSettings(false); }}
                  onDuplicate={() => duplicateField(field.id)}
                  onDelete={() => deleteField(field.id)}
                />
              ))}
            </Reorder.Group>

            {/* Add Field Button */}
            <div className="mt-4 relative" ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker(!showFieldPicker)}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-safety-orange hover:text-safety-orange transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Field
              </button>

              <AnimatePresence>
                {showFieldPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-xl shadow-xl z-20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Choose field type</span>
                      <button
                        onClick={() => setShowFieldPicker(false)}
                        className="p-1 text-gray-500 hover:text-gray-900"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                      {fieldTypes.map((fieldType) => (
                        <button
                          key={fieldType.type}
                          onClick={() => addField(fieldType.type)}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors text-center group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <fieldType.icon size={20} className="text-gray-500 group-hover:text-safety-orange transition-colors" />
                          </div>
                          <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">
                            {fieldType.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Empty state hint */}
            {fields.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Plus size={48} className="mx-auto mb-4 opacity-50" />
                <p>Add fields to build your form</p>
              </div>
            )}
          </div>
        </div>

        {/* Field Settings Panel - Bottom sheet on mobile, side panel on desktop */}
        <AnimatePresence mode="wait">
          {selectedField && (
            <>
              {/* Mobile overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setSelectedFieldId(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 lg:relative lg:z-auto lg:bottom-auto lg:left-auto lg:right-auto w-full lg:w-80 max-h-[70vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 rounded-t-2xl lg:rounded-none shadow-xl lg:shadow-none"
              >
                {/* Mobile drag handle */}
                <div className="lg:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                  <h3 className="font-medium text-gray-900">Field Settings</h3>
                  <button
                    onClick={() => setSelectedFieldId(null)}
                    className="p-1 text-gray-500 hover:text-gray-900"
                  >
                    <X size={18} />
                  </button>
                </div>
              <div className="p-4 space-y-4">
                {/* Field Type Badge */}
                <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-safety-orange/10 flex items-center justify-center">
                    {(() => {
                      const FieldIcon = fieldTypes.find(f => f.type === selectedField.type)?.icon || TextT;
                      return <FieldIcon size={16} className="text-safety-orange" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {fieldTypes.find(f => f.type === selectedField.type)?.label}
                    </div>
                    <div className="text-xs text-gray-500">Field type</div>
                  </div>
                </div>

                {/* Label */}
                <div className="form-field">
                  <label className="form-label">Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) =>
                      updateField(selectedField.id, { label: e.target.value })
                    }
                    className="input"
                  />
                </div>

                {/* Default Value / URL Parameter (for hidden fields) */}
                {selectedField.type === 'hidden' && (
                  <div className="form-field">
                    <label className="form-label">Default Value</label>
                    <input
                      type="text"
                      value={selectedField.defaultValue || ''}
                      onChange={(e) =>
                        updateField(selectedField.id, { defaultValue: e.target.value })
                      }
                      className="input"
                      placeholder="e.g. {{utm_source}} or static value"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use <code className="bg-gray-100 px-1 rounded">{'{{param}}'}</code> to capture URL parameters
                    </p>
                  </div>
                )}

                {/* Media URL (for image/video fields) */}
                {(selectedField.type === 'image' || selectedField.type === 'video') && (
                  <div className="form-field">
                    <label className="form-label">{selectedField.type === 'image' ? 'Image URL' : 'Video URL'}</label>
                    <input
                      type="url"
                      value={selectedField.mediaUrl || ''}
                      onChange={(e) => updateField(selectedField.id, { mediaUrl: e.target.value })}
                      className="input"
                      placeholder={selectedField.type === 'image' ? 'https://example.com/photo.jpg' : 'https://youtube.com/watch?v=...'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedField.type === 'image' ? 'Direct link to an image (JPG, PNG, GIF, WebP)' : 'YouTube or Vimeo URL'}
                    </p>
                  </div>
                )}

                {/* Payment settings */}
                {selectedField.type === 'payment' && (
                  <div className="space-y-3">
                    <div className="form-field">
                      <label className="form-label">Amount</label>
                      <input type="number" min="0.50" step="0.01" value={selectedField.amount || ''} onChange={(e) => updateField(selectedField.id, { amount: parseFloat(e.target.value) || 0 })} className="input" placeholder="10.00" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Currency</label>
                      <select value={selectedField.currency || 'usd'} onChange={(e) => updateField(selectedField.id, { currency: e.target.value })} className="input">
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="cad">CAD ($)</option>
                        <option value="aud">AUD ($)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Placeholder */}
                {!['checkbox', 'radio', 'file', 'rating', 'hidden', 'image', 'video', 'payment'].includes(selectedField.type) && (
                  <div className="form-field">
                    <label className="form-label">Placeholder</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) =>
                        updateField(selectedField.id, { placeholder: e.target.value })
                      }
                      className="input"
                      placeholder="Enter placeholder text..."
                    />
                  </div>
                )}

                {/* Options for select, radio, checkbox */}
                {['checkbox', 'radio', 'select'].includes(selectedField.type) && (
                  <div className="form-field">
                    <label className="form-label">Options</label>
                    <div className="space-y-2">
                      {(selectedField.options || []).map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[index] = e.target.value;
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="input flex-1"
                          />
                          <button
                            onClick={() => {
                              const newOptions = (selectedField.options || []).filter(
                                (_, i) => i !== index
                              );
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="p-2 text-gray-500 hover:text-red-500 rounded hover:bg-gray-100"
                            disabled={(selectedField.options || []).length <= 1}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOptions = [
                            ...(selectedField.options || []),
                            `Option ${(selectedField.options || []).length + 1}`,
                          ];
                          updateField(selectedField.id, { options: newOptions });
                        }}
                        className="text-sm text-safety-orange hover:text-gray-900 flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-gray-200">
                  <div>
                    <label className="text-sm text-gray-900">Required</label>
                    <p className="text-xs text-gray-500">Must be filled to submit</p>
                  </div>
                  <button
                    onClick={() =>
                      updateField(selectedField.id, {
                        required: !selectedField.required,
                      })
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      selectedField.required ? 'bg-safety-orange' : 'bg-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow',
                        selectedField.required ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>

                {/* Conditional Logic */}
                <div className="py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-gray-500" />
                      <label className="text-sm text-gray-900">Conditional Logic</label>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedField.condition) {
                          updateField(selectedField.id, { condition: undefined });
                        } else {
                          const otherFields = fields.filter(f => f.id !== selectedField.id);
                          if (otherFields.length > 0) {
                            updateField(selectedField.id, {
                              condition: {
                                fieldId: otherFields[0].id,
                                operator: 'equals',
                                value: '',
                              },
                            });
                          }
                        }
                      }}
                      disabled={fields.filter(f => f.id !== selectedField.id).length === 0}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        selectedField.condition ? 'bg-safety-orange' : 'bg-gray-300',
                        fields.filter(f => f.id !== selectedField.id).length === 0 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow',
                          selectedField.condition ? 'translate-x-5' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>

                  {selectedField.condition && (
                    <div className="space-y-3 pl-6 border-l-2 border-safety-orange/30">
                      <p className="text-xs text-gray-500">Show this field when:</p>

                      {/* Field selector */}
                      <select
                        value={selectedField.condition.fieldId}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            condition: { ...selectedField.condition!, fieldId: e.target.value },
                          })
                        }
                        className="input text-sm"
                      >
                        {fields
                          .filter((f) => f.id !== selectedField.id)
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                      </select>

                      {/* Operator selector */}
                      <select
                        value={selectedField.condition.operator}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            condition: {
                              ...selectedField.condition!,
                              operator: e.target.value as ConditionOperator,
                            },
                          })
                        }
                        className="input text-sm"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="contains">Contains</option>
                        <option value="not_empty">Is not empty</option>
                        <option value="is_empty">Is empty</option>
                      </select>

                      {/* Value input (not needed for empty checks) */}
                      {!['not_empty', 'is_empty'].includes(selectedField.condition.operator) && (
                        <>
                          {(() => {
                            const targetField = fields.find(f => f.id === selectedField.condition?.fieldId);
                            if (targetField && ['radio', 'select'].includes(targetField.type)) {
                              return (
                                <select
                                  value={selectedField.condition.value || ''}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      condition: { ...selectedField.condition!, value: e.target.value },
                                    })
                                  }
                                  className="input text-sm"
                                >
                                  <option value="">Select value...</option>
                                  {(targetField.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }
                            return (
                              <input
                                type="text"
                                placeholder="Value..."
                                value={selectedField.condition.value || ''}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    condition: { ...selectedField.condition!, value: e.target.value },
                                  })
                                }
                                className="input text-sm"
                              />
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {fields.filter(f => f.id !== selectedField.id).length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Add more fields to use conditional logic</p>
                  )}
                </div>

                {/* Delete Field */}
                <button
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full btn bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 justify-center"
                >
                  <Trash size={16} />
                  Delete Field
                </button>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Form Settings Panel */}
        <AnimatePresence mode="wait">
          {showFormSettings && !selectedField && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setShowFormSettings(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 lg:relative lg:z-auto lg:bottom-auto lg:left-auto lg:right-auto w-full lg:w-80 max-h-[70vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto shrink-0 rounded-t-2xl lg:rounded-none shadow-xl lg:shadow-none"
              >
                <div className="lg:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                  <h3 className="font-medium text-gray-900">Form Settings</h3>
                  <button onClick={() => setShowFormSettings(false)} className="p-1 text-gray-500 hover:text-gray-900">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4 space-y-6">
                  {/* Branding */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Palette size={16} className="text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-900">Branding</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="form-field">
                        <label className="form-label">Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={formSettings.branding?.accentColor || '#ef6f2e'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, accentColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                          <input type="text" value={formSettings.branding?.accentColor || '#ef6f2e'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, accentColor: e.target.value } })} className="input flex-1 text-sm" placeholder="#ef6f2e" />
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Background Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={formSettings.branding?.backgroundColor || '#ffffff'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, backgroundColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                          <input type="text" value={formSettings.branding?.backgroundColor || '#ffffff'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, backgroundColor: e.target.value } })} className="input flex-1 text-sm" placeholder="#ffffff" />
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={formSettings.branding?.textColor || '#111827'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, textColor: e.target.value } })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                          <input type="text" value={formSettings.branding?.textColor || '#111827'} onChange={(e) => setFormSettings({ ...formSettings, branding: { ...formSettings.branding, textColor: e.target.value } })} className="input flex-1 text-sm" placeholder="#111827" />
                        </div>
                      </div>
                      {formSettings.branding?.accentColor && (
                        <button onClick={() => setFormSettings({ ...formSettings, branding: undefined })} className="text-xs text-gray-500 hover:text-gray-700">Reset to defaults</button>
                      )}
                    </div>
                  </div>
                  {/* Thank You Screen */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={16} className="text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-900">Thank You Screen</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="form-field">
                        <label className="form-label">Heading</label>
                        <input type="text" value={formSettings.thankYou?.heading || ''} onChange={(e) => setFormSettings({ ...formSettings, thankYou: { ...formSettings.thankYou, heading: e.target.value } })} className="input" placeholder="Thank you!" />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Message</label>
                        <textarea value={formSettings.thankYou?.message || ''} onChange={(e) => setFormSettings({ ...formSettings, thankYou: { ...formSettings.thankYou, message: e.target.value } })} className="input min-h-20" placeholder="Your response has been submitted successfully." />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Redirect URL</label>
                        <input type="url" value={formSettings.thankYou?.redirectUrl || ''} onChange={(e) => setFormSettings({ ...formSettings, thankYou: { ...formSettings.thankYou, redirectUrl: e.target.value } })} className="input" placeholder="https://example.com/thanks" />
                        <p className="text-xs text-gray-500 mt-1">Redirect after submission instead of showing thank you screen</p>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <label className="text-sm text-gray-900">Show Forma branding</label>
                          <p className="text-xs text-gray-500">{planType === 'free' ? 'Upgrade to remove branding' : 'Display "Powered by Forma"'}</p>
                        </div>
                        <button
                          disabled={planType === 'free'}
                          onClick={() => setFormSettings({ ...formSettings, thankYou: { ...formSettings.thankYou, showBranding: formSettings.thankYou?.showBranding === false ? true : false } })}
                          className={cn('w-11 h-6 rounded-full transition-colors relative', formSettings.thankYou?.showBranding !== false ? 'bg-safety-orange' : 'bg-gray-300', planType === 'free' && 'opacity-50 cursor-not-allowed')}
                        >
                          <div className={cn('w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow', formSettings.thankYou?.showBranding !== false ? 'translate-x-5' : 'translate-x-0.5')} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* AI Generation Modal */}
      <AnimatePresence>
        {showAIModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowAIModal(false)}
          >
            <motion.div
              ref={aiModalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-safety-orange flex items-center justify-center">
                    <Sparkle size={20} weight="fill" className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Form Generator</h2>
                    <p className="text-sm text-gray-500">Describe your form and we'll create it for you</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="form-field">
                  <label className="form-label">Describe your form</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAIPrompt(e.target.value)}
                    placeholder="e.g., A contact form for my website with name, email, phone, and a message field..."
                    className="input min-h-[120px] resize-none"
                    autoFocus
                  />
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium mb-2">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Contact form',
                      'Customer feedback survey',
                      'Event RSVP',
                      'Job application',
                      'Newsletter signup',
                      'Bug report form',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setAIPrompt(example)}
                        className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-safety-orange/50 hover:bg-safety-orange/5 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setAIPrompt('');
                    setError('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Spinner size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkle size={18} weight="fill" />
                      Generate Form
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
    case 'date':
      return (
        <input
          type={field.type === 'date' ? 'date' : 'text'}
          placeholder={field.placeholder || `Enter ${field.type}...`}
          className="input pointer-events-none"
          disabled
        />
      );
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder || 'Enter text...'}
          className="input min-h-[80px] pointer-events-none"
          disabled
        />
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {(field.options || []).slice(0, 3).map((option, index) => (
            <label key={index} className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" className="rounded border-gray-300" disabled />
              {option}
            </label>
          ))}
          {(field.options || []).length > 3 && (
            <span className="text-xs text-gray-500">+{(field.options || []).length - 3} more</span>
          )}
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options || []).slice(0, 3).map((option, index) => (
            <label key={index} className="flex items-center gap-2 text-gray-600">
              <input type="radio" className="border-gray-300" disabled />
              {option}
            </label>
          ))}
          {(field.options || []).length > 3 && (
            <span className="text-xs text-gray-500">+{(field.options || []).length - 3} more</span>
          )}
        </div>
      );
    case 'select':
      return (
        <select className="input pointer-events-none" disabled>
          <option>Select an option</option>
        </select>
      );
    case 'file':
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
          <UploadSimple size={20} className="mx-auto mb-1" />
          <span className="text-xs">File upload</span>
        </div>
      );
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={20} className="text-gray-500" />
          ))}
        </div>
      );
    case 'page_break':
      return null; // Rendered differently in the parent
    default:
      return null;
  }
}
