'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  PencilSimple,
  CreditCard,
  ChartLineUp,
  GlobeHemisphereWest,
  WebhooksLogo,
  Robot,
  ArrowRight,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

interface FeatureCard {
  number: string;
  icon: Icon;
  title: string;
  description: string;
}

const features: FeatureCard[] = [
  {
    number: '01',
    icon: PencilSimple,
    title: 'Drag & Drop Builder',
    description: 'Visual editor with conditional logic, multi-step flows, and 17+ field types.',
  },
  {
    number: '02',
    icon: CreditCard,
    title: 'Payment Collection',
    description: 'Accept payments via Stripe directly in your forms. Money goes straight to your account.',
  },
  {
    number: '03',
    icon: ChartLineUp,
    title: 'Analytics Dashboard',
    description: 'Track conversions, funnel drop-offs, geo data, and revenue per form in real time.',
  },
  {
    number: '04',
    icon: GlobeHemisphereWest,
    title: 'Custom Domains',
    description: 'Serve forms on your own domain with automatic SSL and full white-label branding.',
  },
  {
    number: '05',
    icon: WebhooksLogo,
    title: 'Webhooks & Events',
    description: 'Real-time webhooks with retry logic, HMAC signatures, and delivery logs.',
  },
  {
    number: '06',
    icon: Robot,
    title: 'AI-Powered Forms',
    description: 'Generate entire forms from text descriptions. Smart field suggestions and spam detection.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-9">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 sm:mb-16"
        >
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-3 uppercase mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-safety-orange shadow-[0_0_8px_rgba(239,111,46,0.6)]" />
              <span className="font-mono text-[11px] sm:text-[13px] tracking-[-0.015rem] uppercase text-gray-500">
                Features
              </span>
            </div>

            <h2 className="font-normal text-[28px] sm:text-[36px] lg:text-[52px] leading-[1.1] tracking-[-0.03em] text-gray-900">
              Everything you need
              <br />
              to capture data<span className="text-safety-orange">.</span>
            </h2>
          </div>

          <p className="font-mono text-[14px] sm:text-[15px] text-gray-500 max-w-md leading-relaxed lg:text-right">
            From simple contact forms to complex multi-step workflows.
            Build, deploy, and scale with confidence.
          </p>
        </motion.div>

        {/* Editorial Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden"
        >
          {/* Feature cards - each spans 2 cols */}
          {features.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: index * 0.06 }}
              className={`group bg-white p-6 sm:p-8 col-span-1 sm:col-span-1 lg:col-span-2 transition-colors duration-300 hover:bg-gray-50 ${
                index === 0 ? 'lg:col-span-2 lg:row-span-1' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <span className="font-mono text-[11px] text-gray-300 uppercase">{feature.number}</span>
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-safety-orange/10 transition-colors">
                  <feature.icon
                    size={22}
                    weight="duotone"
                    className="text-gray-400 group-hover:text-safety-orange transition-colors"
                  />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-mono">{feature.description}</p>
            </motion.div>
          ))}

          {/* Dark highlight card - $0 unlimited submissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a0a0a] p-6 sm:p-8 col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col justify-between min-h-[200px]"
          >
            <div className="flex items-start justify-between mb-auto">
              <span className="font-mono text-[11px] text-white/30 uppercase">07</span>
              <span className="px-2 py-1 rounded bg-safety-orange/20 text-safety-orange font-mono text-[10px] uppercase">
                Included free
              </span>
            </div>
            <div className="mt-8">
              <div className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-2">$0</div>
              <div className="text-xl sm:text-2xl text-white/60 font-light">Unlimited submissions</div>
              <p className="font-mono text-[13px] text-white/40 mt-3">
                No per-submission fees. Ever.
              </p>
            </div>
          </motion.div>

          {/* Wide dark card - Ten more features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
            className="bg-[#0a0a0a] p-6 sm:p-8 col-span-1 sm:col-span-2 lg:col-span-3 flex items-center justify-between group cursor-pointer"
          >
            <div>
              <h3 className="text-lg sm:text-xl font-medium text-white mb-1">Ten more features</h3>
              <p className="font-mono text-[13px] text-white/40">
                File uploads, teams, SSO, HIPAA, and more.
              </p>
            </div>
            <Link
              href="#pricing"
              className="flex items-center gap-2 text-safety-orange font-mono text-[13px] uppercase group-hover:gap-3 transition-all"
            >
              Explore
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
