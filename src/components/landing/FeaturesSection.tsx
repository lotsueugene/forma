'use client';

import { motion } from 'framer-motion';
import {
  PencilSimple,
  Code,
  WebhooksLogo,
  ChartLineUp,
  ShieldCheck,
  Lightning,
  Database,
  Plugs,
  Users,
  Globe,
  DeviceMobile,
  Robot,
} from '@phosphor-icons/react';

const features = [
  {
    icon: PencilSimple,
    title: 'Drag & Drop Builder',
    description:
      'Create forms visually with conditional logic, multi-step flows, and 20+ field types.',
  },
  {
    icon: Code,
    title: 'Developer API',
    description:
      'RESTful API with SDKs for JavaScript, Python, Go, and more. Full programmatic control.',
  },
  {
    icon: WebhooksLogo,
    title: 'Webhooks & Events',
    description:
      'Real-time webhooks with retry logic, HMAC signatures, and conditional triggers.',
  },
  {
    icon: ChartLineUp,
    title: 'Analytics Dashboard',
    description:
      'Track conversion rates, funnel drop-offs, geo data, and submission trends.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    description:
      'SOC 2, GDPR, HIPAA compliant. Data encryption at rest and in transit.',
  },
  {
    icon: Lightning,
    title: 'Edge Performance',
    description:
      'Forms served from 200+ global edge nodes. Sub-50ms response times.',
  },
  {
    icon: Database,
    title: 'Submission Storage',
    description:
      'Unlimited storage with full-text search, filtering, tagging, and export options.',
  },
  {
    icon: Plugs,
    title: '50+ Integrations',
    description:
      'Connect to Slack, Salesforce, HubSpot, Zapier, and dozens more out of the box.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Role-based access, shared workspaces, comments, and activity logging.',
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description:
      'Built-in i18n support. Translate forms and validation messages easily.',
  },
  {
    icon: DeviceMobile,
    title: 'Mobile Optimized',
    description:
      'Responsive forms with touch-friendly inputs and native mobile keyboards.',
  },
  {
    icon: Robot,
    title: 'AI-Powered',
    description:
      'Auto-generate forms from descriptions, smart field suggestions, spam detection.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-gray-50">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-9">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 lg:mb-20"
        >
          {/* Status Badge */}
          <div className="text-pretty font-mono text-[15px] leading-[100%] tracking-[-0.0175rem] inline-flex items-center gap-3 uppercase mb-8">
            <div className="size-2.5 transform-gpu rounded-full border bg-safety-orange border-transparent shadow-[0_0_8px_rgba(255,77,0,0.6)]" />
            <p className="whitespace-nowrap text-gray-700 text-pretty font-mono text-[13px] leading-[100%] tracking-[-0.015rem] uppercase">
              Features
            </p>
          </div>

          <h2
            className="font-normal text-[32px] leading-[100%] tracking-[-0.08rem] lg:text-[48px] lg:tracking-[-0.12rem] mb-6 text-gray-900"
          >
            Everything you need to
            <br />
            capture data<span className="text-safety-orange">.</span>
          </h2>

          <p className="font-mono text-[16px] leading-[140%] tracking-[-0.02rem] lg:text-[18px] text-gray-700 max-w-2xl">
            From simple contact forms to complex multi-step workflows. Build,
            deploy, and scale with confidence.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 20,
                delay: index * 0.05,
              }}
              className="group relative"
            >
              <div className="h-full border-gray-200 bg-white rounded-xl border p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-safety-orange/10 flex items-center justify-center mb-4">
                  <feature.icon
                    size={22}
                    className="text-safety-orange"
                    weight="duotone"
                  />
                </div>

                {/* Content */}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed font-mono">
                  {feature.description}
                </p>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
