export interface FormTemplate {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string; // phosphor icon name
  fields: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }>;
  seoTitle: string;
  seoDescription: string;
  settings?: {
    displayMode?: 'conversational' | 'classic';
    branding?: {
      accentColor?: string;
      backgroundColor?: string;
      textColor?: string;
    };
  };
  tagline?: string; // Short punchy line for template cards
  useCases?: string[]; // Who this is for
}

const id = () => Math.random().toString(36).slice(2, 9);

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    slug: 'contact-form',
    title: 'Contact Form',
    description: 'A clean, professional contact form that converts. Captures name, email, and message with smart field validation.',
    tagline: 'The essential form every website needs',
    useCases: ['Agencies', 'SaaS', 'Freelancers', 'Small Business'],
    category: 'Contact',
    icon: 'EnvelopeSimple',
    seoTitle: 'Free Contact Form Template | Forma',
    seoDescription: 'Create a professional contact form in seconds. Includes name, email, phone, and message fields. Free to use, no coding required.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#ef6f2e', backgroundColor: '#ffffff', textColor: '#111827' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: id(), type: 'select', label: 'Subject', required: true, options: ['General Inquiry', 'Support', 'Sales', 'Partnership', 'Other'] },
      { id: id(), type: 'textarea', label: 'Message', placeholder: 'How can we help you?', required: true },
    ],
  },
  {
    slug: 'feedback-survey',
    title: 'Customer Feedback Survey',
    description: 'Understand what your customers really think. Star ratings, NPS-style questions, and open feedback — all in one conversational flow.',
    tagline: 'Turn customer opinions into actionable insights',
    useCases: ['Product Teams', 'Customer Success', 'E-commerce', 'SaaS'],
    category: 'Feedback',
    icon: 'ChatCircle',
    seoTitle: 'Free Customer Feedback Survey Template | Forma',
    seoDescription: 'Build a customer feedback survey with star ratings, NPS scores, and open-ended questions. Free template, instant setup.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#8b5cf6', backgroundColor: '#faf5ff', textColor: '#1e1b4b' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Your Name', placeholder: 'Optional', required: false },
      { id: id(), type: 'email', label: 'Email', placeholder: 'For follow-up (optional)', required: false },
      { id: id(), type: 'rating', label: 'Overall Satisfaction', required: true },
      { id: id(), type: 'radio', label: 'Would you recommend us?', required: true, options: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'] },
      { id: id(), type: 'select', label: 'What could we improve?', required: false, options: ['Product quality', 'Customer service', 'Pricing', 'Website experience', 'Delivery speed', 'Other'] },
      { id: id(), type: 'textarea', label: 'Additional Comments', placeholder: 'Tell us more...', required: false },
    ],
  },
  {
    slug: 'registration-form',
    title: 'User Registration',
    description: 'Streamlined signup flow that reduces friction. Collect essentials without overwhelming new users.',
    tagline: 'Onboard users with zero friction',
    useCases: ['Apps', 'Communities', 'Memberships', 'Courses'],
    category: 'Auth',
    icon: 'UserCircle',
    seoTitle: 'Free Registration Form Template | Forma',
    seoDescription: 'Create a user registration form with name, email, phone, and custom fields. Free template for signups and memberships.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#0ea5e9', backgroundColor: '#f0f9ff', textColor: '#0c4a6e' },
    },
    fields: [
      { id: id(), type: 'text', label: 'First Name', placeholder: 'John', required: true },
      { id: id(), type: 'text', label: 'Last Name', placeholder: 'Doe', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: id(), type: 'text', label: 'Organization', placeholder: 'Company or school name', required: false },
      { id: id(), type: 'select', label: 'How did you hear about us?', required: false, options: ['Google Search', 'Social Media', 'Friend/Colleague', 'Blog/Article', 'Other'] },
    ],
  },
  {
    slug: 'event-registration',
    title: 'Event Registration',
    description: 'Professional event signup with ticket types, dietary preferences, and accessibility options. Works for conferences, meetups, and workshops.',
    tagline: 'Fill every seat at your next event',
    useCases: ['Conferences', 'Workshops', 'Meetups', 'Webinars'],
    category: 'Events',
    icon: 'Calendar',
    seoTitle: 'Free Event Registration Form Template | Forma',
    seoDescription: 'Create an event registration form with attendee details, meal preferences, and session choices. Free template for any event.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#f59e0b', backgroundColor: '#fffbeb', textColor: '#78350f' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: id(), type: 'text', label: 'Organization', placeholder: 'Company or school', required: false },
      { id: id(), type: 'select', label: 'Ticket Type', required: true, options: ['General Admission', 'VIP', 'Student', 'Speaker'] },
      { id: id(), type: 'select', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Kosher', 'Halal', 'Other'] },
      { id: id(), type: 'textarea', label: 'Special Requests', placeholder: 'Any accessibility needs or special requests?', required: false },
    ],
  },
  {
    slug: 'newsletter-signup',
    title: 'Newsletter Signup',
    description: 'Minimal, high-converting email capture. No distractions — just a name and email to grow your audience fast.',
    tagline: 'Grow your list, one subscriber at a time',
    useCases: ['Creators', 'Newsletters', 'Blogs', 'Startups'],
    category: 'Marketing',
    icon: 'EnvelopeSimple',
    seoTitle: 'Free Newsletter Signup Form Template | Forma',
    seoDescription: 'Build a clean newsletter signup form. Capture emails and grow your audience. Free template, works on any website.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#10b981', backgroundColor: '#ecfdf5', textColor: '#064e3b' },
    },
    fields: [
      { id: id(), type: 'text', label: 'First Name', placeholder: 'Your first name', required: false },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
    ],
  },
  {
    slug: 'job-application',
    title: 'Job Application',
    description: 'Complete hiring form with resume upload, LinkedIn profile, experience level, and cover letter. Screen candidates before the interview.',
    tagline: 'Hire smarter with structured applications',
    useCases: ['HR Teams', 'Startups', 'Agencies', 'Recruiters'],
    category: 'HR',
    icon: 'Briefcase',
    seoTitle: 'Free Job Application Form Template | Forma',
    seoDescription: 'Create a job application form with resume upload, work experience, and cover letter. Free template for hiring.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#6366f1', backgroundColor: '#eef2ff', textColor: '#312e81' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: id(), type: 'url', label: 'LinkedIn Profile', placeholder: 'https://linkedin.com/in/...', required: false },
      { id: id(), type: 'select', label: 'Position Applied For', required: true, options: ['Software Engineer', 'Product Manager', 'Designer', 'Marketing', 'Sales', 'Other'] },
      { id: id(), type: 'select', label: 'Years of Experience', required: true, options: ['0-1 years', '2-3 years', '4-6 years', '7-10 years', '10+ years'] },
      { id: id(), type: 'file', label: 'Resume/CV', required: true },
      { id: id(), type: 'textarea', label: 'Cover Letter', placeholder: 'Tell us why you\'re a great fit...', required: false },
    ],
  },
  {
    slug: 'bug-report',
    title: 'Bug Report',
    description: 'Structured bug reporting with severity levels, reproduction steps, and screenshot uploads. Get actionable reports from users.',
    tagline: 'Catch bugs before they catch you',
    useCases: ['Product Teams', 'QA', 'Open Source', 'Support'],
    category: 'Support',
    icon: 'Bug',
    seoTitle: 'Free Bug Report Form Template | Forma',
    seoDescription: 'Create a bug report form with severity levels, reproduction steps, and file uploads. Free template for product teams.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#ef4444', backgroundColor: '#fef2f2', textColor: '#7f1d1d' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Your Name', placeholder: 'Optional', required: false },
      { id: id(), type: 'email', label: 'Email', placeholder: 'For follow-up', required: true },
      { id: id(), type: 'text', label: 'Bug Summary', placeholder: 'Brief description of the issue', required: true },
      { id: id(), type: 'select', label: 'Severity', required: true, options: ['Critical - App is broken', 'High - Major feature broken', 'Medium - Minor feature broken', 'Low - Cosmetic issue'] },
      { id: id(), type: 'textarea', label: 'Steps to Reproduce', placeholder: '1. Go to...\n2. Click on...\n3. See error...', required: true },
      { id: id(), type: 'textarea', label: 'Expected Behavior', placeholder: 'What should have happened?', required: false },
      { id: id(), type: 'file', label: 'Screenshot', required: false },
    ],
  },
  {
    slug: 'payment-form',
    title: 'Payment Form',
    description: 'Accept one-time payments with Stripe. Customer details, plan selection, and secure checkout in one seamless flow.',
    tagline: 'Get paid without the payment page hassle',
    useCases: ['Freelancers', 'Consultants', 'Small Business', 'Services'],
    category: 'Payments',
    icon: 'CreditCard',
    seoTitle: 'Free Payment Form Template | Forma',
    seoDescription: 'Create a payment form with Stripe integration. Collect payments directly through your forms. Free template.',
    settings: {
      displayMode: 'classic',
      branding: { accentColor: '#059669', backgroundColor: '#ffffff', textColor: '#111827' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'text', label: 'Company', placeholder: 'Optional', required: false },
      { id: id(), type: 'select', label: 'Plan', required: true, options: ['Basic - $9/mo', 'Pro - $29/mo', 'Enterprise - $99/mo'] },
      { id: id(), type: 'payment', label: 'Payment', required: true },
    ],
  },
  {
    slug: 'order-form',
    title: 'Order Form',
    description: 'Product ordering with quantities, shipping address, and special instructions. Built for small businesses that sell directly.',
    tagline: 'Sell products without a full e-commerce site',
    useCases: ['Small Business', 'Crafts', 'Food', 'Merch'],
    category: 'E-commerce',
    icon: 'ShoppingCart',
    seoTitle: 'Free Order Form Template | Forma',
    seoDescription: 'Create a product order form with quantities, shipping address, and payment. Free template for small businesses.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#d946ef', backgroundColor: '#fdf4ff', textColor: '#4a044e' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: id(), type: 'text', label: 'Shipping Address', placeholder: '123 Main St, City, State, ZIP', required: true },
      { id: id(), type: 'select', label: 'Product', required: true, options: ['Product A', 'Product B', 'Product C', 'Bundle Pack'] },
      { id: id(), type: 'number', label: 'Quantity', placeholder: '1', required: true },
      { id: id(), type: 'textarea', label: 'Special Instructions', placeholder: 'Any special requests?', required: false },
    ],
  },
  {
    slug: 'nps-survey',
    title: 'NPS Survey',
    description: 'The industry-standard loyalty metric. One question, one follow-up, maximum insight into customer sentiment.',
    tagline: 'Measure loyalty with one powerful question',
    useCases: ['Product Teams', 'Customer Success', 'SaaS', 'Services'],
    category: 'Feedback',
    icon: 'Star',
    seoTitle: 'Free NPS Survey Template | Forma',
    seoDescription: 'Measure customer loyalty with a Net Promoter Score survey. Free NPS template with follow-up questions.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#f97316', backgroundColor: '#fff7ed', textColor: '#7c2d12' },
    },
    fields: [
      { id: id(), type: 'rating', label: 'How likely are you to recommend us? (1-5)', required: true },
      { id: id(), type: 'radio', label: 'What is the primary reason for your score?', required: true, options: ['Product quality', 'Customer service', 'Value for money', 'Ease of use', 'Other'] },
      { id: id(), type: 'textarea', label: 'What could we do to improve?', placeholder: 'Your feedback helps us get better...', required: false },
      { id: id(), type: 'email', label: 'Email (optional)', placeholder: 'For follow-up', required: false },
    ],
  },
  {
    slug: 'booking-form',
    title: 'Booking / Appointment',
    description: 'Let clients book time with you. Date, time, service selection, and notes — everything needed to schedule seamlessly.',
    tagline: 'Let clients book you in seconds',
    useCases: ['Consultants', 'Salons', 'Clinics', 'Coaches'],
    category: 'Scheduling',
    icon: 'Clock',
    seoTitle: 'Free Booking Form Template | Forma',
    seoDescription: 'Create a booking and appointment form with date/time selection and service options. Free template for any business.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#14b8a6', backgroundColor: '#f0fdfa', textColor: '#134e4a' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: id(), type: 'select', label: 'Service', required: true, options: ['Consultation', 'Demo', 'Training', 'Support Call', 'Other'] },
      { id: id(), type: 'date', label: 'Preferred Date', required: true },
      { id: id(), type: 'select', label: 'Preferred Time', required: true, options: ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'] },
      { id: id(), type: 'textarea', label: 'Notes', placeholder: 'Anything we should know?', required: false },
    ],
  },
  {
    slug: 'waitlist',
    title: 'Waitlist / Early Access',
    description: 'Build anticipation before launch. Capture interest with a clean, minimal signup that makes people feel exclusive.',
    tagline: 'Build hype before you build the product',
    useCases: ['Startups', 'Product Hunt', 'Beta Launches', 'Creators'],
    category: 'Marketing',
    icon: 'Rocket',
    seoTitle: 'Free Waitlist Form Template | Forma',
    seoDescription: 'Create a waitlist or early access signup form for your product launch. Free template to build your audience.',
    settings: {
      displayMode: 'conversational',
      branding: { accentColor: '#1d4ed8', backgroundColor: '#0f172a', textColor: '#f1f5f9' },
    },
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'text', label: 'Company / Project', placeholder: 'What are you working on?', required: false },
      { id: id(), type: 'radio', label: 'How would you use this?', required: false, options: ['Personal project', 'Startup', 'Small business', 'Enterprise', 'Just curious'] },
    ],
  },
];
