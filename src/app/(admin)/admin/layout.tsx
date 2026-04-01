'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  House,
  Users,
  Megaphone,
  EnvelopeSimple,
  Spinner,
  SignOut,
  CaretLeft,
  CurrencyDollar,
  FileText,
  Article,
  Link as LinkIcon,
  Briefcase,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Overview', icon: House },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pricing', label: 'Pricing', icon: CurrencyDollar },
  { href: '/admin/pages', label: 'Static Pages', icon: FileText },
  { href: '/admin/blog', label: 'Blog Posts', icon: Article },
  { href: '/admin/careers', label: 'Careers', icon: Briefcase },
  { href: '/admin/footer', label: 'Footer Links', icon: LinkIcon },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/broadcasts', label: 'Email Broadcasts', icon: EnvelopeSimple },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    fetch('/api/admin')
      .then(res => {
        if (res.ok) {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => {
        router.push('/dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
            <CaretLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-3">Admin Panel</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-[#ef6f2e]/10 text-[#ef6f2e]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Admin Access
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
