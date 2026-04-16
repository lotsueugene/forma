'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  Users,
  Megaphone,
  EnvelopeSimple,
  Spinner,
  CaretLeft,
  CurrencyDollar,
  FileText,
  Files,
  Article,
  Link as LinkIcon,
  Briefcase,
  Buildings,
  List,
  X,
  Gear,
  Shield,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: null, // No header for top-level
    items: [
      { href: '/admin', label: 'Overview', icon: House },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/workspaces', label: 'Workspaces', icon: Buildings },
      { href: '/admin/forms', label: 'Forms', icon: Files },
      { href: '/admin/pricing', label: 'Pricing', icon: CurrencyDollar },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/pages', label: 'Static Pages', icon: FileText },
      { href: '/admin/blog', label: 'Blog Posts', icon: Article },
      { href: '/admin/careers', label: 'Careers', icon: Briefcase },
      { href: '/admin/footer', label: 'Footer Links', icon: LinkIcon },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/admin/broadcasts', label: 'Email Broadcasts', icon: EnvelopeSimple },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/audit-log', label: 'Audit Log', icon: Shield },
      { href: '/admin/settings', label: 'Settings', icon: Gear },
    ],
  },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
              <CaretLeft size={16} />
              Back to Dashboard
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mt-3">Admin Panel</h1>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navSections.map((section, sIndex) => (
            <div key={sIndex}>
              {section.label && (
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-safety-orange/10 text-safety-orange'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Admin Access
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 flex items-center justify-between px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-900"
          >
            <List size={24} />
          </button>
          <span className="font-semibold text-gray-900">Admin Panel</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
