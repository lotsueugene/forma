import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface GeneratedField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Smart form field generator based on keywords
function generateFormFields(prompt: string): { name: string; fields: GeneratedField[] } {
  const lowerPrompt = prompt.toLowerCase();
  const fields: GeneratedField[] = [];
  let formName = 'Generated Form';

  // Contact form patterns
  if (lowerPrompt.includes('contact') || lowerPrompt.includes('get in touch') || lowerPrompt.includes('reach out')) {
    formName = 'Contact Form';
    fields.push(
      { id: generateId(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: generateId(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: generateId(), type: 'textarea', label: 'Message', placeholder: 'How can we help you?', required: true }
    );
  }
  // Feedback/Survey patterns
  else if (lowerPrompt.includes('feedback') || lowerPrompt.includes('survey') || lowerPrompt.includes('satisfaction')) {
    formName = 'Feedback Form';
    fields.push(
      { id: generateId(), type: 'text', label: 'Your Name', placeholder: 'Optional', required: false },
      { id: generateId(), type: 'email', label: 'Email', placeholder: 'For follow-up (optional)', required: false },
      { id: generateId(), type: 'rating', label: 'Overall Satisfaction', required: true },
      { id: generateId(), type: 'radio', label: 'Would you recommend us?', required: true, options: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'] },
      { id: generateId(), type: 'textarea', label: 'What could we improve?', placeholder: 'Your feedback helps us get better', required: false }
    );
  }
  // Registration/Signup patterns
  else if (lowerPrompt.includes('registration') || lowerPrompt.includes('signup') || lowerPrompt.includes('sign up') || lowerPrompt.includes('register')) {
    formName = 'Registration Form';
    fields.push(
      { id: generateId(), type: 'text', label: 'First Name', placeholder: 'John', required: true },
      { id: generateId(), type: 'text', label: 'Last Name', placeholder: 'Doe', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
      { id: generateId(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: generateId(), type: 'text', label: 'Company/Organization', placeholder: 'Acme Inc.', required: false }
    );
  }
  // Event/RSVP patterns
  else if (lowerPrompt.includes('event') || lowerPrompt.includes('rsvp') || lowerPrompt.includes('invitation') || lowerPrompt.includes('attend')) {
    formName = 'Event RSVP';
    fields.push(
      { id: generateId(), type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'For confirmation', required: true },
      { id: generateId(), type: 'radio', label: 'Will you attend?', required: true, options: ['Yes, I\'ll be there', 'Maybe', 'No, I can\'t make it'] },
      { id: generateId(), type: 'number', label: 'Number of Guests', placeholder: '1', required: false },
      { id: generateId(), type: 'textarea', label: 'Dietary Restrictions', placeholder: 'Any food allergies or preferences?', required: false }
    );
  }
  // Job application patterns
  else if (lowerPrompt.includes('job') || lowerPrompt.includes('application') || lowerPrompt.includes('career') || lowerPrompt.includes('apply') || lowerPrompt.includes('hiring')) {
    formName = 'Job Application';
    fields.push(
      { id: generateId(), type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'your@email.com', required: true },
      { id: generateId(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: generateId(), type: 'url', label: 'LinkedIn Profile', placeholder: 'https://linkedin.com/in/yourprofile', required: false },
      { id: generateId(), type: 'url', label: 'Portfolio/Website', placeholder: 'https://yourwebsite.com', required: false },
      { id: generateId(), type: 'file', label: 'Resume/CV', required: true },
      { id: generateId(), type: 'textarea', label: 'Cover Letter', placeholder: 'Tell us why you\'re a great fit...', required: false }
    );
  }
  // Order/Booking patterns
  else if (lowerPrompt.includes('order') || lowerPrompt.includes('booking') || lowerPrompt.includes('reservation') || lowerPrompt.includes('appointment')) {
    formName = 'Booking Form';
    fields.push(
      { id: generateId(), type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'For confirmation', required: true },
      { id: generateId(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: generateId(), type: 'date', label: 'Preferred Date', required: true },
      { id: generateId(), type: 'select', label: 'Preferred Time', required: true, options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'] },
      { id: generateId(), type: 'textarea', label: 'Special Requests', placeholder: 'Any special requirements?', required: false }
    );
  }
  // Newsletter/Subscribe patterns
  else if (lowerPrompt.includes('newsletter') || lowerPrompt.includes('subscribe') || lowerPrompt.includes('mailing list') || lowerPrompt.includes('updates')) {
    formName = 'Newsletter Signup';
    fields.push(
      { id: generateId(), type: 'text', label: 'First Name', placeholder: 'Your first name', required: false },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
      { id: generateId(), type: 'checkbox', label: 'Interests', required: false, options: ['Product Updates', 'Industry News', 'Tips & Tutorials', 'Special Offers'] }
    );
  }
  // Bug report/Support patterns
  else if (lowerPrompt.includes('bug') || lowerPrompt.includes('support') || lowerPrompt.includes('issue') || lowerPrompt.includes('help') || lowerPrompt.includes('ticket')) {
    formName = 'Support Request';
    fields.push(
      { id: generateId(), type: 'text', label: 'Your Name', placeholder: 'Your full name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'For follow-up', required: true },
      { id: generateId(), type: 'select', label: 'Issue Type', required: true, options: ['Bug Report', 'Feature Request', 'General Question', 'Billing Issue', 'Other'] },
      { id: generateId(), type: 'select', label: 'Priority', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: generateId(), type: 'text', label: 'Subject', placeholder: 'Brief description', required: true },
      { id: generateId(), type: 'textarea', label: 'Description', placeholder: 'Please describe your issue in detail...', required: true },
      { id: generateId(), type: 'file', label: 'Attachments', required: false }
    );
  }
  // Default generic form
  else {
    // Try to extract a form name from the prompt
    const words = prompt.split(' ').slice(0, 3).join(' ');
    formName = words.charAt(0).toUpperCase() + words.slice(1) + ' Form';

    fields.push(
      { id: generateId(), type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
      { id: generateId(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true }
    );

    // Add fields based on keywords in prompt
    if (lowerPrompt.includes('phone') || lowerPrompt.includes('call')) {
      fields.push({ id: generateId(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false });
    }
    if (lowerPrompt.includes('date') || lowerPrompt.includes('when')) {
      fields.push({ id: generateId(), type: 'date', label: 'Date', required: false });
    }
    if (lowerPrompt.includes('rate') || lowerPrompt.includes('rating') || lowerPrompt.includes('score')) {
      fields.push({ id: generateId(), type: 'rating', label: 'Rating', required: false });
    }
    if (lowerPrompt.includes('message') || lowerPrompt.includes('comment') || lowerPrompt.includes('details')) {
      fields.push({ id: generateId(), type: 'textarea', label: 'Additional Details', placeholder: 'Tell us more...', required: false });
    }
    if (lowerPrompt.includes('file') || lowerPrompt.includes('upload') || lowerPrompt.includes('attach')) {
      fields.push({ id: generateId(), type: 'file', label: 'Attachment', required: false });
    }
    if (lowerPrompt.includes('website') || lowerPrompt.includes('url') || lowerPrompt.includes('link')) {
      fields.push({ id: generateId(), type: 'url', label: 'Website', placeholder: 'https://', required: false });
    }

    // Add a generic message field if nothing else was added
    if (fields.length <= 2) {
      fields.push({ id: generateId(), type: 'textarea', label: 'Message', placeholder: 'Enter your message...', required: false });
    }
  }

  return { name: formName, fields };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide a description of the form you want to create' },
        { status: 400 }
      );
    }

    const result = generateFormFields(prompt.trim());

    return NextResponse.json({
      success: true,
      name: result.name,
      fields: result.fields,
    });
  } catch (error) {
    console.error('Error generating form:', error);
    return NextResponse.json(
      { error: 'Failed to generate form' },
      { status: 500 }
    );
  }
}
