import { Stack } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Templates', href: '/templates' },
    { label: 'Integrations', href: '/integrations' },
  ],
  developers: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '/docs/api' },
    { label: 'SDKs', href: '/docs/sdks' },
    { label: 'Webhooks', href: '/docs/webhooks' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-24 px-6 relative z-10">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between gap-16">
        {/* Left: System Health */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <Stack size={32} weight="fill" className="text-gray-900" />
            <span className="font-sans text-2xl font-bold tracking-tighter text-gray-900">
              Forma
            </span>
          </div>

          <div className="flex flex-col gap-3 font-mono text-sm tracking-widest text-gray-700 mt-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-safety-orange animate-pulse drop-shadow-[0_0_4px_rgba(255,77,0,0.8)]" />
              <span>
                API: <span className="text-green-600">OPTIMAL</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-safety-orange animate-pulse drop-shadow-[0_0_4px_rgba(255,77,0,0.8)]" />
              <span>
                FORMS: <span className="text-green-600">ONLINE</span>
              </span>
            </div>
          </div>

          <p className="font-mono text-xs text-gray-600 uppercase tracking-wider max-w-xs mt-4">
            The modern form builder for developers. Build, collect, and integrate with
            ease.
          </p>
        </div>

        {/* Right: Sitemap */}
        <div className="flex flex-wrap gap-16">
          <div className="flex flex-col gap-5 font-mono text-xs uppercase tracking-widest">
            <span className="text-gray-900 font-bold">Product</span>
            {footerLinks.product.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-safety-orange transition-none"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-5 font-mono text-xs uppercase tracking-widest">
            <span className="text-gray-900 font-bold">Developers</span>
            {footerLinks.developers.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-safety-orange transition-none"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-5 font-mono text-xs uppercase tracking-widest">
            <span className="text-gray-900 font-bold">Company</span>
            {footerLinks.company.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-safety-orange transition-none"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-5 font-mono text-xs uppercase tracking-widest">
            <span className="text-gray-900 font-bold">Legal</span>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-safety-orange transition-none"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-gray-600 hover:text-safety-orange transition-none"
            >
              Terms
            </Link>
            <Link
              href="/security"
              className="text-gray-600 hover:text-safety-orange transition-none"
            >
              Security
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mx-auto max-w-7xl mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">
          {new Date().getFullYear()} Forma. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse drop-shadow-[0_0_4px_rgba(39,201,63,0.8)]" />
          <span className="font-mono text-xs text-gray-600 uppercase tracking-widest">
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
