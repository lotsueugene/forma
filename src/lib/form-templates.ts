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
}

const id = () => Math.random().toString(36).slice(2, 9);

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    slug: 'contact-form',
    title: 'Contact Form',
    description: 'Simple contact form with name, email, and message fields. Perfect for any website.',
    category: 'Contact',
    icon: 'EnvelopeSimple',
    seoTitle: 'Free Contact Form Template | Forma',
    seoDescription: 'Create a professional contact form in seconds. Includes name, email, phone, and message fields. Free to use, no coding required.',
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
    description: 'Collect detailed customer feedback with ratings, multiple choice, and open-ended questions.',
    category: 'Feedback',
    icon: 'ChatCircle',
    seoTitle: 'Free Customer Feedback Survey Template | Forma',
    seoDescription: 'Build a customer feedback survey with star ratings, NPS scores, and open-ended questions. Free template, instant setup.',
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
    description: 'User signup form with essential fields. Great for apps, events, and memberships.',
    category: 'Auth',
    icon: 'UserCircle',
    seoTitle: 'Free Registration Form Template | Forma',
    seoDescription: 'Create a user registration form with name, email, phone, and custom fields. Free template for signups and memberships.',
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
    description: 'Event signup form with attendee details, dietary preferences, and session selection.',
    category: 'Events',
    icon: 'Calendar',
    seoTitle: 'Free Event Registration Form Template | Forma',
    seoDescription: 'Create an event registration form with attendee details, meal preferences, and session choices. Free template for any event.',
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
    description: 'Minimal email capture form for growing your mailing list.',
    category: 'Marketing',
    icon: 'EnvelopeSimple',
    seoTitle: 'Free Newsletter Signup Form Template | Forma',
    seoDescription: 'Build a clean newsletter signup form. Capture emails and grow your audience. Free template, works on any website.',
    fields: [
      { id: id(), type: 'text', label: 'First Name', placeholder: 'Your first name', required: false },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
    ],
  },
  {
    slug: 'job-application',
    title: 'Job Application',
    description: 'Collect job applications with resume upload, experience details, and cover letter.',
    category: 'HR',
    icon: 'Briefcase',
    seoTitle: 'Free Job Application Form Template | Forma',
    seoDescription: 'Create a job application form with resume upload, work experience, and cover letter. Free template for hiring.',
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
    description: 'Let users report bugs with severity, steps to reproduce, and screenshots.',
    category: 'Support',
    icon: 'Bug',
    seoTitle: 'Free Bug Report Form Template | Forma',
    seoDescription: 'Create a bug report form with severity levels, reproduction steps, and file uploads. Free template for product teams.',
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
    description: 'Collect payments with customer details and Stripe checkout integration.',
    category: 'Payments',
    icon: 'CreditCard',
    seoTitle: 'Free Payment Form Template | Forma',
    seoDescription: 'Create a payment form with Stripe integration. Collect payments directly through your forms. Free template.',
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
    description: 'Product order form with quantity, shipping details, and special instructions.',
    category: 'E-commerce',
    icon: 'ShoppingCart',
    seoTitle: 'Free Order Form Template | Forma',
    seoDescription: 'Create a product order form with quantities, shipping address, and payment. Free template for small businesses.',
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
    description: 'Net Promoter Score survey to measure customer loyalty and satisfaction.',
    category: 'Feedback',
    icon: 'Star',
    seoTitle: 'Free NPS Survey Template | Forma',
    seoDescription: 'Measure customer loyalty with a Net Promoter Score survey. Free NPS template with follow-up questions.',
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
    description: 'Schedule appointments with date, time, and service selection.',
    category: 'Scheduling',
    icon: 'Clock',
    seoTitle: 'Free Booking Form Template | Forma',
    seoDescription: 'Create a booking and appointment form with date/time selection and service options. Free template for any business.',
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
    description: 'Build hype for your launch with a simple waitlist signup form.',
    category: 'Marketing',
    icon: 'Rocket',
    seoTitle: 'Free Waitlist Form Template | Forma',
    seoDescription: 'Create a waitlist or early access signup form for your product launch. Free template to build your audience.',
    fields: [
      { id: id(), type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
      { id: id(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: id(), type: 'text', label: 'Company / Project', placeholder: 'What are you working on?', required: false },
      { id: id(), type: 'radio', label: 'How would you use this?', required: false, options: ['Personal project', 'Startup', 'Small business', 'Enterprise', 'Just curious'] },
    ],
  },
];
