export type FieldType =
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
  | 'payment'
  | 'booking'
  | 'terms';

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

export interface FormField {
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
  nextPageCondition?: FieldCondition;
  bookingMode?: 'custom' | 'fixed';
  slotDuration?: number;
  weeklySchedule?: Record<number, Array<{ start: string; end: string }>>;
  availabilityEnabled?: boolean;
  termsText?: string; // Rich text content for terms field, supports [link text](url) syntax
}

export interface FormSettings {
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
  saveAndResume?: boolean;
  customCss?: string;
  displayMode?: 'classic' | 'conversational';
  social?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
}
