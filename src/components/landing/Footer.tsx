import { Stack } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const fallbackLinks = {
  product: [
    { label: 'Features', href: '#features', external: false },
    { label: 'Pricing', href: '#pricing', external: false },
  ],
  developers: [
    { label: 'Documentation', href: '/docs', external: false },
  ],
  company: [
    { label: 'Contact', href: '/contact', external: false },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy', external: false },
    { label: 'Terms', href: '/terms', external: false },
  ],
};

type FooterLink = {
  label: string;
  href: string;
  external: boolean;
};

type FooterLinks = Record<string, FooterLink[]>;

async function getFooterLinks(): Promise<FooterLinks> {
  try {
    const links = await prisma.footerLink.findMany({
      where: { active: true },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
      select: {
        section: true,
        label: true,
        href: true,
        external: true,
      },
    });

    const grouped: FooterLinks = {};
    links.forEach((link) => {
      if (!grouped[link.section]) {
        grouped[link.section] = [];
      }
      grouped[link.section].push({
        label: link.label,
        href: link.href,
        external: link.external,
      });
    });

    if (Object.keys(grouped).length === 0) {
      return fallbackLinks;
    }

    return grouped;
  } catch (error) {
    console.error('Error fetching footer links:', error);
    return fallbackLinks;
  }
}

const sectionConfig: Record<string, string> = {
  product: 'Product',
  developers: 'Developers',
  company: 'Company',
  legal: 'Legal',
};

export default async function Footer() {
  const footerLinks = await getFooterLinks();

  const orderedSections = Object.keys(sectionConfig).filter(
    (section) => footerLinks[section] && footerLinks[section].length > 0
  );

  return (
    <footer className="bg-[#0a0a0a] pt-16 sm:pt-24 pb-8 px-4 sm:px-6 relative z-10">
      <div className="mx-auto max-w-[1400px]">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-12 pb-16 sm:pb-20 border-b border-white/10">
          {/* Brand + Status */}
          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <Stack size={24} weight="fill" className="text-white" />
              <span className="font-sans text-xl font-medium tracking-[-0.04em] text-white">
                Forma
              </span>
            </div>

            <p className="font-mono text-[13px] text-white/40 leading-relaxed max-w-xs">
              The modern way to build and manage forms. Collect, automate,
              and integrate with ease.
            </p>

            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <span className="font-mono text-[11px] text-white/40 uppercase tracking-wider">
                All systems operational
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {orderedSections.map((section) => (
              <div key={section} className="flex flex-col gap-4">
                <span className="font-mono text-[11px] text-white/30 uppercase tracking-wider font-medium">
                  {sectionConfig[section]}
                </span>
                {footerLinks[section].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="font-mono text-[13px] text-white/50 hover:text-safety-orange transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Giant "Forma." text */}
        <div className="py-12 sm:py-16 overflow-hidden">
          <div
            className="text-[80px] sm:text-[120px] lg:text-[180px] font-normal tracking-[-0.04em] leading-none text-white/[0.03] select-none"
          >
            Forma<span className="text-safety-orange/10">.</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-white/30 uppercase tracking-wider text-center sm:text-left">
            {new Date().getFullYear()} Forma. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="font-mono text-[11px] text-white/30 uppercase tracking-wider">
              Status
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
