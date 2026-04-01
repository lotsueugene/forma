'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Stack,
  ArrowLeft,
  Copy,
  Check,
  Code,
  PaperPlaneTilt,
  Key,
  Lightning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const codeExamples = {
  curl: `curl -X POST https://yourapp.com/api/forms/FORM_ID/submissions \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello from the API!"
  }'`,
  javascript: `fetch('https://yourapp.com/api/forms/FORM_ID/submissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello from the API!'
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
  python: `import requests

response = requests.post(
    'https://yourapp.com/api/forms/FORM_ID/submissions',
    json={
        'name': 'John Doe',
        'email': 'john@example.com',
        'message': 'Hello from the API!'
    }
)

print(response.json())`,
  html: `<form action="https://yourapp.com/api/forms/FORM_ID/submissions" method="POST">
  <input type="text" name="name" placeholder="Name" required />
  <input type="email" name="email" placeholder="Email" required />
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Submit</button>
</form>`,
};

type CodeLang = keyof typeof codeExamples;

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<CodeLang>('curl');
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
              Forma
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
              Docs
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {/* Back link */}
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-safety-orange transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Documentation
          </Link>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              API Reference
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Integrate Forma into your applications. Submit form data from anywhere using our simple REST API.
            </p>
          </div>

          {/* Quick Start */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Lightning size={24} className="text-safety-orange" />
              Quick Start
            </h2>
            <div className="card p-6 space-y-4">
              <p className="text-gray-600">
                Send a POST request to your form's endpoint with JSON data. No authentication required for submissions.
              </p>
              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg font-mono text-sm">
                <span className="text-emerald-600">POST</span>
                <span className="text-gray-700">/api/forms/</span>
                <span className="text-safety-orange">{'<FORM_ID>'}</span>
                <span className="text-gray-700">/submissions</span>
              </div>
            </div>
          </section>

          {/* Code Examples */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Code size={24} className="text-safety-orange" />
              Code Examples
            </h2>
            <div className="card overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {(['curl', 'javascript', 'python', 'html'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-4 py-3 text-sm font-medium transition-colors',
                      activeTab === tab
                        ? 'text-safety-orange border-b-2 border-safety-orange -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Code Block */}
              <div className="relative">
                <button
                  onClick={copyCode}
                  className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copied ? (
                    <Check size={18} className="text-emerald-600" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
                <pre className="p-6 overflow-x-auto">
                  <code className="text-sm text-gray-700 font-mono">
                    {codeExamples[activeTab]}
                  </code>
                </pre>
              </div>
            </div>
          </section>

          {/* Response Format */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <PaperPlaneTilt size={24} className="text-safety-orange" />
              Response Format
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card p-6">
                <h3 className="text-gray-800 font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Success (200)
                </h3>
                <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
                  <code className="text-gray-700 font-mono">{`{
  "success": true,
  "submission": {
    "id": "clx123abc...",
    "createdAt": "2024-01-15T..."
  }
}`}</code>
                </pre>
              </div>
              <div className="card p-6">
                <h3 className="text-gray-800 font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Error (4xx/5xx)
                </h3>
                <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
                  <code className="text-gray-700 font-mono">{`{
  "error": "Form not found or not active"
}

// Or for limit reached:
{
  "error": "Monthly submission limit reached"
}`}</code>
                </pre>
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Key size={24} className="text-safety-orange" />
              API Keys (Optional)
            </h2>
            <div className="card p-6 space-y-4">
              <p className="text-gray-600">
                Form submissions don't require authentication. API keys are for accessing your data programmatically:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-safety-orange mt-1">•</span>
                  List forms and submissions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-safety-orange mt-1">•</span>
                  Create and manage forms via API
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-safety-orange mt-1">•</span>
                  Export data programmatically
                </li>
              </ul>
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Include your API key in requests:</p>
                <code className="text-sm text-gray-700 font-mono">
                  Authorization: Bearer frm_live_xxxxx
                </code>
              </div>
              <Link
                href="/signup"
                className="btn btn-primary inline-flex"
              >
                <Key size={18} />
                Get Your API Key
              </Link>
            </div>
          </section>

          {/* Rate Limits */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Rate Limits</h2>
            <div className="card p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-semibold text-gray-900 mb-1">100</div>
                  <div className="text-sm text-gray-500">Requests/minute</div>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-semibold text-gray-900 mb-1">50</div>
                  <div className="text-sm text-gray-500">Submissions/month (Free)</div>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-semibold text-gray-900 mb-1">Unlimited</div>
                  <div className="text-sm text-gray-500">Submissions (Pro)</div>
                </div>
              </div>
            </div>
          </section>

          {/* Need Help */}
          <section className="card p-6 bg-gradient-to-r from-safety-orange/5 to-safety-orange/10 border-safety-orange/20">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Need Help?</h2>
            <p className="text-gray-600 mb-4">
              Having trouble integrating? Check out our examples or reach out to support.
            </p>
            <div className="flex gap-3">
              <a
                href="mailto:support@withforma.io"
                className="btn btn-secondary"
              >
                Contact Support
              </a>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
