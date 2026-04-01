'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Stack,
  Book,
  Code,
  Rocket,
  Key,
  WebhooksLogo,
  Lightning,
  ArrowRight,
  CaretDown,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface DocSection {
  title: string;
  icon: typeof Rocket;
  items: {
    label: string;
    content: React.ReactNode;
  }[];
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm">
      <code className={`language-${language}`}>{children}</code>
    </pre>
  );
}

const sections: DocSection[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      {
        label: 'Introduction',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What is Forma?</h3>
            <p className="text-gray-600 mb-4">
              Forma is a developer-first form backend that allows you to collect, manage, and process form submissions
              without writing any backend code. Simply point your HTML form to our API endpoint and start receiving
              submissions instantly.
            </p>
            <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
              <li><strong>No Backend Required</strong> - Point your forms to our API and we handle the rest</li>
              <li><strong>Spam Protection</strong> - Built-in honeypot, rate limiting, and reCAPTCHA support</li>
              <li><strong>Integrations</strong> - Connect to Slack, Google Sheets, Notion, and more</li>
              <li><strong>Webhooks</strong> - Receive real-time notifications for new submissions</li>
              <li><strong>Team Collaboration</strong> - Invite team members with role-based access</li>
            </ul>
          </>
        ),
      },
      {
        label: 'Quick Start',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Get started in 5 minutes</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">1. Create an Account</h4>
                <p className="text-gray-600">Sign up for free at <Link href="/signup" className="text-[#ef6f2e] hover:underline">forma.app/signup</Link>. No credit card required.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">2. Create Your First Form</h4>
                <p className="text-gray-600">From your dashboard, click "Create Form" and give it a name.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">3. Add to Your Website</h4>
                <CodeBlock language="html">{`<form action="https://forma.app/api/forms/YOUR_FORM_ID/submissions" method="POST">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <button type="submit">Submit</button>
</form>`}</CodeBlock>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">4. Start Receiving Submissions</h4>
                <p className="text-gray-600">That's it! Submissions appear in your dashboard instantly.</p>
              </div>
            </div>
          </>
        ),
      },
      {
        label: 'Creating Your First Form',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Using the Form Builder</h3>
            <p className="text-gray-600 mb-4">
              Forma's visual form builder lets you create forms without writing code:
            </p>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
              <li>Go to dashboard and click <strong>Create Form</strong></li>
              <li>Add fields by clicking <strong>Add Field</strong></li>
              <li>Customize labels, placeholders, and validation</li>
              <li>Drag and drop to reorder fields</li>
              <li>Click <strong>Publish</strong> when ready</li>
            </ol>
            <h4 className="font-semibold text-gray-900 mb-2">Available Field Types</h4>
            <p className="text-gray-600">Short Text, Email, Phone, Long Text, Number, Date, Checkbox, Radio, Dropdown, File Upload, Rating, URL</p>
          </>
        ),
      },
    ],
  },
  {
    title: 'API Reference',
    icon: Code,
    items: [
      {
        label: 'Authentication',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">API Keys</h3>
            <p className="text-gray-600 mb-4">
              All API requests (except form submissions) require authentication using an API key.
              Generate keys in <strong>Settings → API Keys</strong>.
            </p>
            <h4 className="font-semibold text-gray-900 mb-2">Using Your API Key</h4>
            <CodeBlock language="bash">{`curl -X GET https://forma.app/api/forms \\
  -H "Authorization: Bearer frm_live_xxxxxxxxxxxxx"`}</CodeBlock>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <WarningCircle size={18} className="text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Form submission endpoints do NOT require authentication to allow public form submissions.
                </p>
              </div>
            </div>
          </>
        ),
      },
      {
        label: 'Forms API',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Forms Endpoints</h3>
            <h4 className="font-semibold text-gray-900 mb-2">List Forms</h4>
            <CodeBlock language="bash">{`GET /api/forms?workspaceId=WORKSPACE_ID`}</CodeBlock>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Create Form</h4>
            <CodeBlock language="bash">{`POST /api/forms
{
  "name": "Contact Form",
  "workspaceId": "WORKSPACE_ID",
  "fields": [
    { "type": "text", "label": "Name", "required": true },
    { "type": "email", "label": "Email", "required": true }
  ]
}`}</CodeBlock>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Update / Delete</h4>
            <CodeBlock language="bash">{`PATCH /api/forms/FORM_ID
DELETE /api/forms/FORM_ID`}</CodeBlock>
          </>
        ),
      },
      {
        label: 'Submissions API',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Submit to a Form</h3>
            <p className="text-gray-600 mb-3">No authentication required for submissions:</p>
            <CodeBlock language="bash">{`POST /api/forms/FORM_ID/submissions
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello!"
}`}</CodeBlock>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">HTML Form</h4>
            <CodeBlock language="html">{`<form action="https://forma.app/api/forms/FORM_ID/submissions" method="POST">
  <input type="text" name="name" />
  <input type="hidden" name="_redirect" value="https://yoursite.com/thanks" />
  <button type="submit">Submit</button>
</form>`}</CodeBlock>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Special Fields</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">_redirect</code> - URL to redirect after submission</li>
              <li><code className="bg-gray-100 px-1 rounded">_honeypot</code> - Spam protection (should be empty)</li>
            </ul>
          </>
        ),
      },
      {
        label: 'Webhooks API',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Webhook Payload</h3>
            <p className="text-gray-600 mb-3">When a submission is received, we POST to your endpoint:</p>
            <CodeBlock language="json">{`{
  "event": "submission.created",
  "data": {
    "submissionId": "clyyy...",
    "formId": "clxxx...",
    "formName": "Contact Form",
    "submittedAt": "2024-01-15T10:30:00Z",
    "submission": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}`}</CodeBlock>
            <p className="text-gray-600 mt-4">
              Verify webhooks using the <code className="bg-gray-100 px-1 rounded">X-Forma-Signature</code> header with HMAC-SHA256.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Integrations',
    icon: WebhooksLogo,
    items: [
      {
        label: 'Slack',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Slack Integration</h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
              <li>Go to <strong>Integrations</strong> in your dashboard</li>
              <li>Click <strong>Add Integration</strong> → Slack</li>
              <li>Create an Incoming Webhook in your Slack workspace at <a href="https://api.slack.com/apps" className="text-[#ef6f2e] hover:underline" target="_blank">api.slack.com/apps</a></li>
              <li>Paste the webhook URL and save</li>
            </ol>
            <p className="text-gray-600">You'll receive a formatted message in Slack with submission data whenever a form is submitted.</p>
          </>
        ),
      },
      {
        label: 'Zapier',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Connect via Zapier</h3>
            <p className="text-gray-600 mb-4">Use webhooks to connect Forma with Zapier:</p>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
              <li>Create a new Zap in Zapier</li>
              <li>Choose "Webhooks by Zapier" → "Catch Hook"</li>
              <li>Copy the webhook URL from Zapier</li>
              <li>Add this URL as a webhook in Forma (Settings → Webhooks)</li>
              <li>Submit a test form to verify</li>
              <li>Add your desired action (Google Sheets, CRM, etc.)</li>
            </ol>
          </>
        ),
      },
      {
        label: 'Google Sheets',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Google Sheets Integration</h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
              <li>Go to <strong>Integrations</strong> in your dashboard</li>
              <li>Click <strong>Add Integration</strong> → Google Sheets</li>
              <li>Connect your Google account</li>
              <li>Select the spreadsheet and sheet to use</li>
              <li>Map form fields to columns</li>
            </ol>
            <p className="text-gray-600">Each submission will be added as a new row in your spreadsheet.</p>
          </>
        ),
      },
      {
        label: 'Custom Webhooks',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Webhooks</h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
              <li>Go to <strong>Settings → Webhooks</strong></li>
              <li>Click <strong>Add Webhook</strong></li>
              <li>Enter your endpoint URL</li>
              <li>Select events to receive</li>
              <li>Save the webhook</li>
            </ol>
            <p className="text-gray-600 mt-4">
              <strong>Retry Logic:</strong> Failed webhooks retry up to 3 times with exponential backoff (1min, 5min, 15min).
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Guides',
    icon: Book,
    items: [
      {
        label: 'Form Validation',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Validation</h3>
            <p className="text-gray-600 mb-4">
              Forma validates submissions automatically based on field types. For best UX, add client-side validation too:
            </p>
            <CodeBlock language="html">{`<input type="email" name="email" required />
<input type="tel" name="phone" pattern="[0-9]{10}" />
<input type="text" name="name" minlength="2" maxlength="100" />`}</CodeBlock>
          </>
        ),
      },
      {
        label: 'File Uploads',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">File Uploads</h3>
            <p className="text-gray-600 mb-3">Use <code className="bg-gray-100 px-1 rounded">multipart/form-data</code> encoding:</p>
            <CodeBlock language="html">{`<form action="..." method="POST" enctype="multipart/form-data">
  <input type="file" name="attachment" accept=".pdf,.doc" />
  <button type="submit">Upload</button>
</form>`}</CodeBlock>
            <p className="text-gray-600 mt-4"><strong>Limits:</strong> 10MB per file, 5 files per submission.</p>
          </>
        ),
      },
      {
        label: 'Spam Protection',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Spam Protection</h3>
            <h4 className="font-semibold text-gray-900 mb-2">Honeypot Field</h4>
            <CodeBlock language="html">{`<input type="text" name="_honeypot" style="display:none" tabindex="-1" />`}</CodeBlock>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Rate Limiting</h4>
            <p className="text-gray-600 mb-2">Automatic limits per IP:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>5 submissions per minute</li>
              <li>30 submissions per hour</li>
            </ul>
            <h4 className="font-semibold text-gray-900 mb-2 mt-4">reCAPTCHA v3</h4>
            <p className="text-gray-600">Enable invisible bot detection in your form settings.</p>
          </>
        ),
      },
      {
        label: 'Custom Domains',
        content: (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Domains</h3>
            <p className="text-gray-600 mb-4">Use your own domain like <code className="bg-gray-100 px-1 rounded">forms.yourdomain.com</code></p>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>Go to <strong>Settings → Custom Domain</strong></li>
              <li>Enter your subdomain</li>
              <li>Add a CNAME record pointing to <code className="bg-gray-100 px-1 rounded">custom.forma.app</code></li>
              <li>Wait for DNS propagation (up to 48 hours)</li>
              <li>Click "Verify Domain"</li>
            </ol>
            <p className="text-gray-600 mt-4">SSL certificates are provisioned automatically via Let's Encrypt.</p>
          </>
        ),
      },
    ],
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItem = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg w-64">
                <MagnifyingGlass size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
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

      {/* Hero */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              Documentation
            </h1>
            <p className="text-gray-600">
              Learn how to integrate Forma into your applications. From quick starts to advanced API usage.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <button
            onClick={() => {
              setExpandedSections({ 'Getting Started': true });
              setExpandedItems({ 'Getting Started-Quick Start': true });
            }}
            className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-[#ef6f2e]/30 hover:shadow-lg transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ef6f2e]/10 flex items-center justify-center mb-3">
              <Rocket size={20} className="text-[#ef6f2e]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#ef6f2e] transition-colors">
              Quick Start
            </h3>
            <p className="text-sm text-gray-600">
              Get up and running in under 5 minutes.
            </p>
          </button>

          <button
            onClick={() => {
              setExpandedSections({ 'API Reference': true });
              setExpandedItems({ 'API Reference-Authentication': true });
            }}
            className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-[#ef6f2e]/30 hover:shadow-lg transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ef6f2e]/10 flex items-center justify-center mb-3">
              <Key size={20} className="text-[#ef6f2e]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#ef6f2e] transition-colors">
              API Authentication
            </h3>
            <p className="text-sm text-gray-600">
              Learn how to authenticate your API requests.
            </p>
          </button>

          <button
            onClick={() => {
              setExpandedSections({ 'Integrations': true });
              setExpandedItems({ 'Integrations-Custom Webhooks': true });
            }}
            className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-[#ef6f2e]/30 hover:shadow-lg transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ef6f2e]/10 flex items-center justify-center mb-3">
              <WebhooksLogo size={20} className="text-[#ef6f2e]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#ef6f2e] transition-colors">
              Webhooks
            </h3>
            <p className="text-sm text-gray-600">
              Receive real-time notifications for submissions.
            </p>
          </button>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ef6f2e]/10 flex items-center justify-center">
                    <section.icon size={18} className="text-[#ef6f2e]" />
                  </div>
                  <h2 className="font-semibold text-gray-900">{section.title}</h2>
                </div>
                <CaretDown
                  size={20}
                  className={cn(
                    'text-gray-500 transition-transform',
                    expandedSections[section.title] && 'rotate-180'
                  )}
                />
              </button>

              {/* Section Items */}
              {expandedSections[section.title] && (
                <div className="divide-y divide-gray-100">
                  {section.items.map((item) => {
                    const itemKey = `${section.title}-${item.label}`;
                    return (
                      <div key={item.label} className="bg-white">
                        {/* Item Header */}
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-700 pl-11">{item.label}</span>
                          <CaretDown
                            size={16}
                            className={cn(
                              'text-gray-400 transition-transform',
                              expandedItems[itemKey] && 'rotate-180'
                            )}
                          />
                        </button>

                        {/* Item Content */}
                        {expandedItems[itemKey] && (
                          <div className="px-4 pb-4 pl-15">
                            <div className="ml-11 p-4 bg-gray-50 rounded-lg">
                              {item.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* API Example */}
        <div className="mt-10 p-6 bg-gray-900 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm text-gray-400 uppercase">Example: Submit to a form</span>
            <span className="px-2 py-1 bg-[#ef6f2e]/20 text-[#ef6f2e] rounded text-xs font-mono uppercase">
              POST
            </span>
          </div>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
{`curl -X POST https://api.forma.app/v1/forms/FORM_ID/submissions \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello from the API!"
  }'`}
          </pre>
        </div>

        {/* Help CTA */}
        <div className="mt-10 p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Need help?
          </h3>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Reach out to our support team.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ef6f2e] text-white rounded-sm font-mono text-[13px] uppercase hover:bg-[#ee6018] transition-colors"
          >
            Contact Support
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>

    </div>
  );
}
