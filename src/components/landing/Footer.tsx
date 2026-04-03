import { Stack } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Fallback links if database fetch fails
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

    // Group by section
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

    // Return fallback if no links in database
    if (Object.keys(grouped).length === 0) {
      return fallbackLinks;
    }

    return grouped;
  } catch (error) {
    console.error('Error fetching footer links:', error);
    return fallbackLinks;
  }
}

// Section display order and titles
const sectionConfig: Record<string, string> = {
  product: 'Product',
  developers: 'Developers',
  company: 'Company',
  legal: 'Legal',
};

export default async function Footer() {
  const footerLinks = await getFooterLinks();

  // Order sections as defined in sectionConfig
  const orderedSections = Object.keys(sectionConfig).filter(
    (section) => footerLinks[section] && footerLinks[section].length > 0
  );

  return (
    <footer className="bg-gray-50 py-16 sm:py-24 px-4 sm:px-6 relative z-10">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between gap-10 sm:gap-16">
        {/* Left: System Health */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex items-center gap-3">
            <Stack size={28} weight="fill" className="text-gray-900 sm:w-8 sm:h-8" />
            <span className="font-sans text-xl sm:text-2xl font-bold tracking-tighter text-gray-900">
              Forma
            </span>
          </div>

          <div className="flex flex-col gap-3 font-mono text-xs sm:text-sm tracking-widest text-gray-700 mt-2 sm:mt-4">
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

          <p className="font-mono text-[10px] sm:text-xs text-gray-600 uppercase tracking-wider max-w-xs mt-2 sm:mt-4">
            The modern way to build and manage forms. Collect, automate, and integrate
            with ease.
          </p>
        </div>

        {/* Right: Sitemap */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-8 sm:gap-16">
          {orderedSections.map((section) => (
            <div key={section} className="flex flex-col gap-5 font-mono text-xs uppercase tracking-widest">
              <span className="text-gray-900 font-bold">{sectionConfig[section]}</span>
              {footerLinks[section].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="text-gray-600 hover:text-safety-orange transition-none"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mx-auto max-w-7xl mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-mono text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest text-center md:text-left">
          {new Date().getFullYear()} Forma. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse drop-shadow-[0_0_4px_rgba(39,201,63,0.8)]" />
          <span className="font-mono text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest">
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
