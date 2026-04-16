'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Stack,
  House,
  Files,
  ChartLineUp,
  Lightning,
  Gear,
  Users,
  Bell,
  Megaphone,
  CaretDown,
  CaretUpDown,
  SignOut,
  Plus,
  List,
  X,
  Buildings,
  Check,
  Shield,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { WorkspaceProvider, useWorkspace } from '@/contexts/workspace-context';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: House, minRole: 'viewer' },
  { name: 'Forms', href: '/dashboard/forms', icon: Files, minRole: 'viewer' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartLineUp, minRole: 'viewer' },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Lightning, minRole: 'manager' },
  { name: 'Team', href: '/dashboard/team', icon: Users, minRole: 'viewer' },
  { name: 'Broadcasts', href: '/dashboard/broadcasts', icon: Megaphone, minRole: 'manager' },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, minRole: 'viewer' },
  { name: 'Settings', href: '/dashboard/settings', icon: Gear, minRole: 'viewer' },
];

const roleLevel: Record<string, number> = { owner: 4, manager: 3, editor: 2, viewer: 1 };

function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, switchWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        switchWorkspace(data.workspace.id);
        setShowCreateModal(false);
        setNewWorkspaceName('');
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading || !currentWorkspace) {
    return (
      <div className="px-4 py-3 border-b border-black/6">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-black/6" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-safety-orange/10 flex items-center justify-center flex-shrink-0">
              <Buildings size={16} className="text-safety-orange" />
            </div>
            <span className="font-medium text-gray-900 truncate text-sm">
              {currentWorkspace.name}
            </span>
          </div>
          <CaretUpDown size={16} className="text-gray-500 flex-shrink-0" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 py-2 bg-white border border-black/6 rounded-lg shadow-xl"
            >
              {workspaces.map((ws) => (
                <div key={ws.id} className="flex items-center hover:bg-gray-100">
                  <button
                    onClick={() => {
                      if (ws.id !== currentWorkspace.id) {
                        switchWorkspace(ws.id);
                        router.push('/dashboard');
                      }
                      setIsOpen(false);
                    }}
                    className="flex-1 px-3 py-2 text-left flex items-center justify-between min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-900 truncate">
                        {ws.name}
                      </span>
                      {ws.isPersonal && (
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                          Personal
                        </span>
                      )}
                    </div>
                    {ws.id === currentWorkspace.id && (
                      <Check size={14} className="text-safety-orange shrink-0" />
                    )}
                  </button>
                  <Link
                    href="/dashboard/settings?tab=workspace"
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setIsOpen(false);
                    }}
                    className="p-2 mr-1 text-gray-300 hover:text-gray-600 rounded transition-colors shrink-0"
                  >
                    <Gear size={14} />
                  </Link>
                </div>
              ))}
              <div className="border-t border-black/6 mt-2 pt-2 px-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <Plus size={14} />
                  Create Workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 bg-white border border-black/6 rounded-xl shadow-xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Workspace
              </h2>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                className="input w-full mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim() || isCreating}
                  className="btn btn-primary"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { currentWorkspace } = useWorkspace();
  const userRole = currentWorkspace?.role || 'viewer';
  const userRoleLevel = roleLevel[userRole] || 1;
  const filteredNavigation = navigation.filter(
    (item) => userRoleLevel >= (roleLevel[item.minRole] || 1)
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [status]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    fetch('/api/admin')
      .then(res => {
        if (res.ok) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = notificationPanelRef.current;
      if (el && !el.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notificationsOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Intentionally not closing dropdowns on route change here to satisfy
  // react-hooks/set-state-in-effect (menus close on click-outside / next interaction).

  // Don't render dashboard while checking auth or redirecting
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-safety-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  const user = session?.user;
  const userInitials = user?.name
      ? user.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : user?.email?.slice(0, 2).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex overflow-x-hidden">
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-black/6 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static shadow-[1px_0_12px_rgba(0,0,0,0.03)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-black/6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-gray-900" />
            <span className="font-sans text-xl font-medium tracking-[-0.04em] text-gray-900">
              Forma
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            // `/dashboard` must not match child routes (e.g. `/dashboard/forms`), or Dashboard stays orange everywhere
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/dashboard/'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-[13px] uppercase tracking-[-0.015rem] transition-all duration-200',
                  isActive
                    ? 'bg-safety-orange/8 text-safety-orange shadow-[inset_0_0_0_1px_rgba(239,111,46,0.12)]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <item.icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-safety-orange' : 'text-gray-500'}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Create Form Button - hidden for viewers */}
        {userRoleLevel >= roleLevel['editor'] && (
          <div className="p-4 border-t border-black/6">
            <Link
              href="/dashboard/forms/new"
              className="w-full flex items-center justify-center gap-2 py-3 font-mono text-[13px] uppercase tracking-[-0.015rem] bg-safety-orange text-white rounded-lg hover:bg-accent-200 border border-transparent transition-all duration-200 shadow-[0_2px_8px_rgba(239,111,46,0.3)]"
            >
              <Plus size={18} weight="bold" />
              Create Form
            </Link>
          </div>
        )}

        {/* User Section */}
        <div className="p-4 border-t border-black/6">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setUserMenuOpen(!userMenuOpen);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-safety-orange to-[#d15010] flex items-center justify-center text-white font-semibold text-sm">
                {userInitials}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-gray-500 font-mono uppercase tracking-wider truncate">
                  {user?.email || 'Free Plan'}
                </div>
              </div>
              <CaretDown
                size={16}
                className={cn(
                  'text-gray-500 transition-transform flex-shrink-0',
                  userMenuOpen && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white border border-black/6 rounded-lg shadow-lg"
                >
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-2 font-mono text-[12px] uppercase tracking-[-0.015rem] text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      <Shield size={16} className="text-safety-orange" />
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 font-mono text-[12px] uppercase tracking-[-0.015rem] text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    <Gear size={16} className="text-gray-500" />
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-2 px-3 py-2 font-mono text-[12px] uppercase tracking-[-0.015rem] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    <SignOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-black/6 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900"
            >
              <List size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell
              ref={notificationPanelRef}
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
              onRequestCloseOtherMenus={() => setUserMenuOpen(false)}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-3 py-4 sm:p-4 lg:p-8 min-w-0">
          <AnnouncementBanner />
          <UpgradeBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardContent>{children}</DashboardContent>
    </WorkspaceProvider>
  );
}
