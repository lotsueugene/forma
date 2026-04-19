import { Stack } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Fallback links if database fetch fails
const fallbackLinks = {
  product: [
    { label: 'Features', href: '#features', external: false },
    { label: 'Pricing', href: '#pricing', external: false },
    { label: 'Templates', href: '/templates', external: false },
    { label: 'Integrations', href: '/integrations', external: false },
  ],
  developers: [
    { label: 'Documentation', href: '/docs', external: false },
    { label: 'API reference', href: '/docs/api', external: false },
    { label: 'Webhooks', href: '/docs', external: false },
    { label: 'Changelog', href: '/changelog', external: false },
  ],
  company: [
    { label: 'About', href: '/about', external: false },
    { label: 'Blog', href: '/blog', external: false },
    { label: 'Careers', href: '/careers', external: false },
    { label: 'Contact', href: '/contact', external: false },
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
};

export default async function Footer() {
  const footerLinks = await getFooterLinks();

  // Order sections as defined in sectionConfig
  const orderedSections = Object.keys(sectionConfig).filter(
    (section) => footerLinks[section] && footerLinks[section].length > 0
  );

  return (
    <footer className="landing-footer">
      <div className="foot-top">
        <div>
          <div className="foot-brand">
            <Stack size={28} weight="fill" color="#ef6f2e" />
            Forma
          </div>
          <p style={{
            fontFamily: 'var(--font-mono, "Geist Mono", ui-monospace, monospace)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            maxWidth: 280,
            marginTop: 24,
            lineHeight: 1.6,
          }}>
            The modern way to build and manage forms. Collect, automate, and integrate with ease.
          </p>
        </div>
        {orderedSections.map((section) => (
          <div key={section} className="foot-col">
            <h4>{sectionConfig[section]}</h4>
            {footerLinks[section].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="giant-mark">Forma<span className="dot-g">.</span></div>
      <div className="foot-bottom">
        <span>&copy; {new Date().getFullYear()} Forma. All rights reserved.</span>
      </div>
    </footer>
  );
}
