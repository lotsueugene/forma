'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Stack,
  ArrowLeft,
  CaretRight,
  Book,
  Code,
  Rocket,
  Key,
  WebhooksLogo,
  Files,
  ShieldCheck,
  Globe,
  Lightning,
  EnvelopeSimple,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';

// Documentation content
const docs: Record<string, { title: string; description: string; content: React.ReactNode }> = {
  'introduction': {
    title: 'Introduction',
    description: 'Learn what Forma is and how it can help you collect form submissions.',
    content: (
      <>
        <h2>What is Forma?</h2>
        <p>
          Forma is a developer-first form backend that allows you to collect, manage, and process form submissions
          without writing any backend code. Simply point your HTML form to our API endpoint and start receiving
          submissions instantly.
        </p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>No Backend Required</strong> - Point your forms to our API and we handle the rest</li>
          <li><strong>Spam Protection</strong> - Built-in honeypot, rate limiting, and reCAPTCHA support</li>
          <li><strong>Integrations</strong> - Connect to Slack, Google Sheets, Notion, and more</li>
          <li><strong>Webhooks</strong> - Receive real-time notifications for new submissions</li>
          <li><strong>Team Collaboration</strong> - Invite team members with role-based access</li>
          <li><strong>API Access</strong> - Full REST API for programmatic form management</li>
        </ul>

        <h2>Getting Started</h2>
        <p>
          The fastest way to get started is to create a form in the dashboard and start collecting submissions.
          Check out our <Link href="/docs/quickstart" className="text-[#ef6f2e] hover:underline">Quick Start guide</Link> to
          get up and running in under 5 minutes.
        </p>
      </>
    ),
  },
  'quickstart': {
    title: 'Quick Start',
    description: 'Get up and running with Forma in under 5 minutes.',
    content: (
      <>
        <h2>Step 1: Create an Account</h2>
        <p>
          Sign up for a free Forma account at <Link href="/signup" className="text-[#ef6f2e] hover:underline">forma.app/signup</Link>.
          No credit card required.
        </p>

        <h2>Step 2: Create Your First Form</h2>
        <p>
          From your dashboard, click "Create Form" and give your form a name. You can use our visual builder
          to add fields, or simply create an API endpoint to receive any JSON data.
        </p>

        <h2>Step 3: Add the Form to Your Website</h2>
        <p>Copy your form's endpoint URL and add it to your HTML form:</p>
        <CodeBlock language="html">{`<form action="https://forma.app/api/forms/YOUR_FORM_ID/submissions" method="POST">
  <input type="text" name="name" placeholder="Your name" required />
  <input type="email" name="email" placeholder="Your email" required />
  <textarea name="message" placeholder="Your message"></textarea>
  <button type="submit">Send Message</button>
</form>`}</CodeBlock>

        <h2>Step 4: Start Receiving Submissions</h2>
        <p>
          That's it! When users submit your form, the data will appear in your Forma dashboard.
          You can also set up email notifications, webhooks, and integrations to process submissions automatically.
        </p>

        <div className="bg-[#ef6f2e]/10 border border-[#ef6f2e]/20 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <Lightning size={20} className="text-[#ef6f2e] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Pro Tip</p>
              <p className="text-sm text-gray-600">
                Add a hidden honeypot field to prevent spam submissions. Just add a hidden input
                field named <code className="bg-gray-100 px-1 rounded">_honeypot</code> and we'll automatically
                reject submissions that fill it in.
              </p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  'first-form': {
    title: 'Creating Your First Form',
    description: 'A step-by-step guide to creating and customizing your first form.',
    content: (
      <>
        <h2>Using the Form Builder</h2>
        <p>
          Forma's visual form builder lets you create forms without writing any code. Here's how to create
          a form using the builder:
        </p>

        <ol>
          <li>Go to your dashboard and click <strong>Create Form</strong></li>
          <li>Choose a name for your form (e.g., "Contact Form")</li>
          <li>Add fields by clicking <strong>Add Field</strong> and selecting the field type</li>
          <li>Customize each field's label, placeholder, and validation settings</li>
          <li>Drag and drop fields to reorder them</li>
          <li>Click <strong>Publish</strong> when you're ready to start receiving submissions</li>
        </ol>

        <h2>Available Field Types</h2>
        <ul>
          <li><strong>Short Text</strong> - Single line text input</li>
          <li><strong>Email</strong> - Email address with validation</li>
          <li><strong>Phone</strong> - Phone number input</li>
          <li><strong>Long Text</strong> - Multi-line textarea</li>
          <li><strong>Number</strong> - Numeric input</li>
          <li><strong>Date</strong> - Date picker</li>
          <li><strong>Checkbox</strong> - Multiple choice checkboxes</li>
          <li><strong>Radio</strong> - Single choice radio buttons</li>
          <li><strong>Dropdown</strong> - Select dropdown</li>
          <li><strong>File Upload</strong> - File attachment</li>
          <li><strong>Rating</strong> - Star rating</li>
          <li><strong>URL</strong> - Website URL</li>
        </ul>

        <h2>API Endpoint Mode</h2>
        <p>
          If you prefer to use your own form design, you can create an "API Endpoint" form instead.
          This creates a simple endpoint that accepts any JSON data structure.
        </p>
      </>
    ),
  },
  'api/authentication': {
    title: 'API Authentication',
    description: 'Learn how to authenticate your API requests.',
    content: (
      <>
        <h2>API Keys</h2>
        <p>
          All API requests (except form submissions) require authentication using an API key.
          You can generate API keys in your workspace settings.
        </p>

        <h2>Creating an API Key</h2>
        <ol>
          <li>Go to <strong>Settings → API Keys</strong> in your dashboard</li>
          <li>Click <strong>Create API Key</strong></li>
          <li>Give your key a descriptive name</li>
          <li>Copy the key immediately - it won't be shown again</li>
        </ol>

        <h2>Using Your API Key</h2>
        <p>Include your API key in the <code>Authorization</code> header:</p>
        <CodeBlock language="bash">{`curl -X GET https://forma.app/api/forms \\
  -H "Authorization: Bearer frm_live_xxxxxxxxxxxxx"`}</CodeBlock>

        <h2>Security Best Practices</h2>
        <ul>
          <li>Never expose API keys in client-side code</li>
          <li>Use environment variables to store keys</li>
          <li>Rotate keys regularly</li>
          <li>Create separate keys for different environments</li>
        </ul>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <WarningCircle size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Important</p>
              <p className="text-sm text-gray-600">
                Form submission endpoints do NOT require authentication. This allows your forms to
                accept submissions from any website. Use CORS and spam protection to secure your forms.
              </p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  'api/forms': {
    title: 'Forms API',
    description: 'Create, read, update, and delete forms programmatically.',
    content: (
      <>
        <h2>List Forms</h2>
        <p>Retrieve all forms in your workspace:</p>
        <CodeBlock language="bash">{`GET /api/forms?workspaceId=WORKSPACE_ID

# Response
{
  "forms": [
    {
      "id": "clxxx...",
      "name": "Contact Form",
      "status": "active",
      "submissions": 42,
      "views": 1250,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}`}</CodeBlock>

        <h2>Create Form</h2>
        <CodeBlock language="bash">{`POST /api/forms
Content-Type: application/json

{
  "name": "Contact Form",
  "workspaceId": "WORKSPACE_ID",
  "fields": [
    { "type": "text", "label": "Name", "required": true },
    { "type": "email", "label": "Email", "required": true }
  ]
}`}</CodeBlock>

        <h2>Update Form</h2>
        <CodeBlock language="bash">{`PATCH /api/forms/FORM_ID
Content-Type: application/json

{
  "name": "Updated Form Name",
  "status": "active"
}`}</CodeBlock>

        <h2>Delete Form</h2>
        <CodeBlock language="bash">{`DELETE /api/forms/FORM_ID`}</CodeBlock>
      </>
    ),
  },
  'api/submissions': {
    title: 'Submissions API',
    description: 'Submit data to forms and retrieve submissions.',
    content: (
      <>
        <h2>Submit to a Form</h2>
        <p>Submit data to a form (no authentication required):</p>
        <CodeBlock language="bash">{`POST /api/forms/FORM_ID/submissions
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello from the API!"
}

# Response
{
  "success": true,
  "submission": {
    "id": "clyyy...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`}</CodeBlock>

        <h2>HTML Form Submission</h2>
        <p>You can also submit using HTML forms:</p>
        <CodeBlock language="html">{`<form action="https://forma.app/api/forms/FORM_ID/submissions" method="POST">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <input type="hidden" name="_redirect" value="https://yoursite.com/thanks" />
  <button type="submit">Submit</button>
</form>`}</CodeBlock>

        <h2>List Submissions</h2>
        <p>Retrieve all submissions for a form (requires authentication):</p>
        <CodeBlock language="bash">{`GET /api/forms/FORM_ID/submissions
Authorization: Bearer YOUR_API_KEY`}</CodeBlock>

        <h2>Special Fields</h2>
        <ul>
          <li><code>_redirect</code> - URL to redirect after submission</li>
          <li><code>_honeypot</code> - Spam protection field (should be empty)</li>
          <li><code>g-recaptcha-response</code> - reCAPTCHA token</li>
        </ul>
      </>
    ),
  },
  'api/webhooks': {
    title: 'Webhooks API',
    description: 'Set up webhooks to receive real-time notifications.',
    content: (
      <>
        <h2>Creating a Webhook</h2>
        <p>
          Webhooks let you receive HTTP POST requests when events occur in your workspace.
          You can create webhooks in Settings → Webhooks.
        </p>

        <h2>Webhook Payload</h2>
        <p>When a submission is received, we'll send a POST request to your endpoint:</p>
        <CodeBlock language="json">{`{
  "event": "submission.created",
  "data": {
    "submissionId": "clyyy...",
    "formId": "clxxx...",
    "formName": "Contact Form",
    "workspaceId": "clzzz...",
    "submittedAt": "2024-01-15T10:30:00Z",
    "submission": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hello!"
    },
    "metadata": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  }
}`}</CodeBlock>

        <h2>Verifying Webhooks</h2>
        <p>
          Each webhook includes an HMAC signature in the <code>X-Forma-Signature</code> header.
          Verify this signature to ensure the webhook is authentic.
        </p>
        <CodeBlock language="javascript">{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</CodeBlock>
      </>
    ),
  },
  'integrations/slack': {
    title: 'Slack Integration',
    description: 'Get notified in Slack when you receive new submissions.',
    content: (
      <>
        <h2>Setting Up Slack</h2>
        <ol>
          <li>Go to <strong>Integrations</strong> in your dashboard</li>
          <li>Click <strong>Add Integration</strong> and select Slack</li>
          <li>Create an Incoming Webhook in your Slack workspace</li>
          <li>Paste the webhook URL and save</li>
        </ol>

        <h2>Creating a Slack Webhook</h2>
        <ol>
          <li>Go to <a href="https://api.slack.com/apps" className="text-[#ef6f2e] hover:underline" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a></li>
          <li>Create a new app or select an existing one</li>
          <li>Go to "Incoming Webhooks" and enable them</li>
          <li>Click "Add New Webhook to Workspace"</li>
          <li>Select the channel where you want notifications</li>
          <li>Copy the webhook URL</li>
        </ol>

        <h2>Message Format</h2>
        <p>
          When a submission is received, you'll get a formatted message in Slack with all the
          submission data and a link to view it in your dashboard.
        </p>
      </>
    ),
  },
  'integrations/zapier': {
    title: 'Zapier Integration',
    description: 'Connect Forma to thousands of apps with Zapier.',
    content: (
      <>
        <h2>Connecting with Zapier</h2>
        <p>
          Use webhooks to connect Forma with Zapier. This allows you to trigger automations
          in thousands of apps whenever you receive a form submission.
        </p>

        <h2>Setting Up a Zap</h2>
        <ol>
          <li>Create a new Zap in Zapier</li>
          <li>Choose "Webhooks by Zapier" as the trigger</li>
          <li>Select "Catch Hook" as the trigger event</li>
          <li>Copy the webhook URL from Zapier</li>
          <li>Add this URL as a webhook in Forma (Settings → Webhooks)</li>
          <li>Submit a test form to verify the connection</li>
          <li>Add your desired action (Google Sheets, Email, CRM, etc.)</li>
        </ol>

        <h2>Popular Zapier Automations</h2>
        <ul>
          <li>Add submissions to Google Sheets</li>
          <li>Create leads in Salesforce or HubSpot</li>
          <li>Send email notifications via Gmail</li>
          <li>Create tasks in Asana or Trello</li>
          <li>Add subscribers to Mailchimp</li>
        </ul>
      </>
    ),
  },
  'integrations/google-sheets': {
    title: 'Google Sheets Integration',
    description: 'Automatically add submissions to a Google Sheet.',
    content: (
      <>
        <h2>Setting Up Google Sheets</h2>
        <ol>
          <li>Go to <strong>Integrations</strong> in your dashboard</li>
          <li>Click <strong>Add Integration</strong> and select Google Sheets</li>
          <li>Connect your Google account</li>
          <li>Select the spreadsheet and sheet to use</li>
          <li>Map form fields to columns</li>
        </ol>

        <h2>Column Mapping</h2>
        <p>
          Each form field will be added as a column in your spreadsheet. The first row will
          contain field names, and each submission will be added as a new row.
        </p>

        <h2>Automatic Headers</h2>
        <p>
          If your sheet is empty, we'll automatically create headers based on your form fields.
          If headers already exist, we'll match submission fields to the appropriate columns.
        </p>
      </>
    ),
  },
  'integrations/webhooks': {
    title: 'Custom Webhooks',
    description: 'Send submission data to any URL.',
    content: (
      <>
        <h2>Creating a Custom Webhook</h2>
        <ol>
          <li>Go to <strong>Settings → Webhooks</strong></li>
          <li>Click <strong>Add Webhook</strong></li>
          <li>Enter your webhook URL</li>
          <li>Select the events you want to receive</li>
          <li>Save the webhook</li>
        </ol>

        <h2>Testing Webhooks</h2>
        <p>
          After creating a webhook, you can send a test request to verify your endpoint is
          receiving data correctly.
        </p>

        <h2>Retry Logic</h2>
        <p>
          If your endpoint returns an error (4xx or 5xx status), we'll retry the webhook up to
          3 times with exponential backoff (1 minute, 5 minutes, 15 minutes).
        </p>
      </>
    ),
  },
  'guides/validation': {
    title: 'Form Validation',
    description: 'Set up client and server-side validation for your forms.',
    content: (
      <>
        <h2>Built-in Validation</h2>
        <p>
          Forma validates submissions automatically based on field types. For example, email fields
          must contain valid email addresses.
        </p>

        <h2>Required Fields</h2>
        <p>
          Mark fields as required in the form builder. Submissions missing required fields will be rejected.
        </p>

        <h2>Client-side Validation</h2>
        <p>For the best user experience, add validation to your HTML forms:</p>
        <CodeBlock language="html">{`<input type="email" name="email" required pattern="[^@]+@[^@]+\\.[^@]+" />
<input type="tel" name="phone" pattern="[0-9]{10}" />
<input type="text" name="name" minlength="2" maxlength="100" />`}</CodeBlock>
      </>
    ),
  },
  'guides/file-uploads': {
    title: 'File Uploads',
    description: 'Accept file attachments in your forms.',
    content: (
      <>
        <h2>Enabling File Uploads</h2>
        <p>
          Add a File Upload field to your form using the form builder. You can configure
          accepted file types and maximum file size.
        </p>

        <h2>HTML Form Setup</h2>
        <p>Make sure your form uses <code>multipart/form-data</code> encoding:</p>
        <CodeBlock language="html">{`<form action="https://forma.app/api/forms/FORM_ID/submissions"
      method="POST"
      enctype="multipart/form-data">
  <input type="file" name="attachment" accept=".pdf,.doc,.docx" />
  <button type="submit">Upload</button>
</form>`}</CodeBlock>

        <h2>File Limits</h2>
        <ul>
          <li>Maximum file size: 10MB per file</li>
          <li>Maximum files per submission: 5</li>
          <li>Files are stored securely and encrypted</li>
        </ul>
      </>
    ),
  },
  'guides/spam-protection': {
    title: 'Spam Protection',
    description: 'Protect your forms from spam submissions.',
    content: (
      <>
        <h2>Honeypot Fields</h2>
        <p>
          The simplest spam protection. Add a hidden field that bots will fill in but humans won't:
        </p>
        <CodeBlock language="html">{`<input type="text" name="_honeypot" style="display:none" tabindex="-1" autocomplete="off" />`}</CodeBlock>

        <h2>Rate Limiting</h2>
        <p>
          Forma automatically rate limits submissions by IP address. Default limits:
        </p>
        <ul>
          <li>5 submissions per minute per IP</li>
          <li>30 submissions per hour per IP</li>
        </ul>

        <h2>reCAPTCHA v3</h2>
        <p>
          For stronger protection, enable reCAPTCHA v3 in your form settings. This provides
          invisible bot detection without annoying your users.
        </p>
        <ol>
          <li>Get a reCAPTCHA v3 site key from Google</li>
          <li>Add the reCAPTCHA script to your page</li>
          <li>Include the token in your form submission</li>
          <li>Configure the secret key in Forma</li>
        </ol>
      </>
    ),
  },
  'guides/custom-domains': {
    title: 'Custom Domains',
    description: 'Use your own domain for form endpoints.',
    content: (
      <>
        <h2>Setting Up a Custom Domain</h2>
        <p>
          Custom domains let you use URLs like <code>forms.yourdomain.com</code> instead of
          <code>forma.app</code> for your form endpoints.
        </p>

        <h2>DNS Configuration</h2>
        <ol>
          <li>Go to <strong>Settings → Custom Domain</strong></li>
          <li>Enter your subdomain (e.g., <code>forms.yourdomain.com</code>)</li>
          <li>Add a CNAME record pointing to <code>custom.forma.app</code></li>
          <li>Wait for DNS propagation (up to 48 hours)</li>
          <li>Click "Verify Domain" to confirm</li>
        </ol>

        <h2>SSL Certificates</h2>
        <p>
          We automatically provision and renew SSL certificates for your custom domain using
          Let's Encrypt. No configuration needed.
        </p>
      </>
    ),
  },
  'custom-css': {
    title: 'Custom CSS',
    description: 'Style your forms with custom CSS to match your brand.',
    content: (
      <>
        <h2>Custom CSS</h2>
        <p>
          Add custom CSS to any form via <strong>Form Settings &gt; Link &amp; Customizations &gt; Custom CSS</strong>.
          Your styles are injected after Forma's default styles, so they override the defaults.
        </p>
        <p><em>Custom CSS is available on Trial and Pro plans.</em></p>

        <h3>Available Selectors</h3>

        <h4>Inputs & Textareas</h4>
        <p>All text inputs, textareas, selects, and date pickers use the <code>.forma-input</code> class.</p>
        <pre><code>{`.forma-input {
  border-radius: 20px;
  font-size: 18px;
  padding: 16px;
}

.forma-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.forma-input::placeholder {
  color: #9ca3af;
  font-style: italic;
}`}</code></pre>

        <h4>Submit Button</h4>
        <p>The submit button uses the <code>.forma-submit</code> class.</p>
        <pre><code>{`.forma-submit {
  border-radius: 999px;
  font-size: 18px;
  padding: 16px 32px;
  background: #8b5cf6;
}`}</code></pre>

        <h4>Field Labels</h4>
        <p>Labels use the <code>.forma-label</code> class.</p>
        <pre><code>{`.forma-label {
  font-family: 'Georgia', serif;
  font-size: 16px;
  text-transform: none;
}`}</code></pre>

        <h4>Form Card</h4>
        <p>The form content area is a <code>&lt;form&gt;</code> element with a card-like appearance.</p>
        <pre><code>{`form {
  border: 2px solid #000;
  border-radius: 24px;
  padding: 40px;
}`}</code></pre>

        <h4>Page Title & Description</h4>
        <p>Title uses <code>.forma-title</code>, description uses <code>.forma-description</code>.</p>
        <pre><code>{`.forma-title {
  font-size: 48px;
  font-family: 'Playfair Display', serif;
}

.forma-description {
  font-size: 20px;
  opacity: 0.7;
}`}</code></pre>

        <h4>Progress Bar (Multi-step forms)</h4>
        <pre><code>{`/* Progress bar track */
.h-2.rounded-full {
  height: 6px;
}

/* Progress bar fill - use the style attribute */`}</code></pre>

        <h4>Checkboxes & Radio Buttons</h4>
        <pre><code>{`input[type="checkbox"],
input[type="radio"] {
  accent-color: #8b5cf6;
  width: 20px;
  height: 20px;
}`}</code></pre>

        <h3>Full Example</h3>
        <p>Here's a complete example that gives your form a purple, rounded look:</p>
        <pre><code>{`/* Override the accent color for the whole form */
.forma-page {
  --forma-accent: #8b5cf6;
}

.forma-input {
  border-radius: 16px;
  border: 2px solid #e5e7eb;
  font-family: 'Inter', sans-serif;
}

.forma-input:focus {
  border-color: var(--forma-accent);
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}

.forma-submit {
  border-radius: 999px;
  font-weight: 700;
}

.forma-label {
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}`}</code></pre>

        <h3>CSS Variables</h3>
        <p>Forma exposes CSS variables for all branding colors. You can override them or use them in your custom CSS:</p>
        <pre><code>{`/* Available variables */
--forma-accent      /* Accent/button color */
--forma-bg          /* Page background */
--forma-text        /* Primary text color */
--forma-text-muted  /* Secondary text color */
--forma-text-faint  /* Placeholder/hint color */
--forma-input-bg    /* Input background */
--forma-input-border /* Input border color */
--forma-card-bg     /* Form card background */
--forma-card-border /* Form card border */

/* Example: override accent color */
.forma-page {
  --forma-accent: #8b5cf6;
}`}</code></pre>

        <h3>Tips</h3>
        <ul>
          <li>Use browser DevTools (F12) to inspect the form and find exact selectors</li>
          <li>Custom CSS overrides Forma's default styles — no <code>!important</code> needed</li>
          <li>Override CSS variables to change colors without targeting individual elements</li>
          <li>Google Fonts can be imported with <code>@import url('https://fonts.googleapis.com/css2?family=...')</code></li>
        </ul>
      </>
    ),
  },
};

function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4">
      <code className={`language-${language}`}>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug || '';

  const doc = docs[slug];

  if (!doc) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-8">The documentation page you're looking for doesn't exist.</p>
          <Link href="/docs" className="btn btn-primary inline-flex">
            Back to Documentation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/docs" className="hover:text-gray-900">Docs</Link>
          <CaretRight size={14} />
          <span className="text-gray-900">{doc.title}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">{doc.title}</h1>
        <p className="text-lg text-gray-600 mb-8">{doc.description}</p>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <style jsx>{`
            .prose h2 {
              font-size: 1.5rem;
              font-weight: 600;
              color: #111827;
              margin-top: 2rem;
              margin-bottom: 1rem;
            }
            .prose h2:first-child {
              margin-top: 0;
            }
            .prose p {
              color: #4b5563;
              margin-bottom: 1rem;
              line-height: 1.75;
            }
            .prose ul, .prose ol {
              margin: 1rem 0;
              padding-left: 1.5rem;
            }
            .prose li {
              color: #4b5563;
              margin-bottom: 0.5rem;
            }
            .prose code {
              background: #f3f4f6;
              padding: 0.125rem 0.375rem;
              border-radius: 0.25rem;
              font-size: 0.875rem;
            }
            .prose strong {
              color: #111827;
            }
          `}</style>
          {doc.content}
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-[#ef6f2e] hover:text-[#ee6018]"
          >
            <ArrowLeft size={16} />
            Back to all docs
          </Link>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-gray-900" />
            <span className="font-sans text-xl font-medium tracking-[-0.04em] text-gray-900">
              Forma
            </span>
            <span className="text-gray-400 mx-2">/</span>
            <span className="font-mono text-sm text-gray-600 uppercase">Docs</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#ef6f2e] text-white rounded-sm font-mono text-[12px] uppercase hover:bg-[#ee6018] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
