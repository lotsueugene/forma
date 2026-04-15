'use client';

import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Bell,
  Key,
  CreditCard,
  ShieldCheck,
  Code,
  Trash,
  Camera,
  Copy,
  Eye,
  EyeSlash,
  Check,
  Plus,
  Spinner,
  Warning,
  CaretDown,
  Buildings,
  UploadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
// Removed hardcoded plan-catalog, using database plans instead

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: { text: string; included: boolean }[];
  popular?: boolean;
}

type SettingsTab = 'profile' | 'workspace' | 'notifications' | 'api' | 'billing' | 'security';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NotificationSettings {
  notifyNewSubmissions: boolean;
  notifyWeeklyDigest: boolean;
  notifyFormErrors: boolean;
  notifyTeamInvites: boolean;
  notifyBilling: boolean;
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Buildings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'billing', label: 'Plans & billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const SETTINGS_TAB_IDS: SettingsTab[] = [
  'profile',
  'workspace',
  'notifications',
  'api',
  'billing',
  'security',
];

function StripeConnectSection({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<{
    connected: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    email?: string;
    businessName?: string;
  } | null>(null);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`/api/stripe/connect?workspaceId=${workspaceId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setAccount(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleConnect = async () => {
    if (!workspaceId) { setError('No workspace selected'); return; }
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to connect');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Network error — please try again');
    } finally {
      setConnecting(false);
    }
  };

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/stripe/connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      setAccount({ connected: false });
      setConfirmDisconnect(false);
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return <div className="py-4"><Spinner size={20} className="animate-spin text-gray-400" /></div>;
  }

  if (account?.connected) {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Check size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {account.businessName || account.email || 'Stripe Account Connected'}
            </p>
            <p className="text-xs text-gray-500">
              {account.chargesEnabled ? 'Accepting payments' : 'Setup incomplete — click to finish onboarding'}
            </p>
          </div>
          {!account.chargesEnabled && (
            <button onClick={handleConnect} disabled={connecting} className="btn btn-primary text-sm">
              {connecting ? <Spinner size={16} className="animate-spin" /> : 'Complete Setup'}
            </button>
          )}
        </div>
        {confirmDisconnect ? (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs text-red-600 flex-1">Forms with payment fields will stop collecting payments.</p>
            <button
              onClick={() => setConfirmDisconnect(false)}
              className="btn btn-ghost text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
          >
            Disconnect Stripe account
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn btn-secondary flex items-center gap-2"
      >
        {connecting ? <Spinner size={16} className="animate-spin" /> : <CreditCard size={18} />}
        Connect Stripe Account
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    notifyNewSubmissions: true,
    notifyWeeklyDigest: true,
    notifyFormErrors: true,
    notifyTeamInvites: true,
    notifyBilling: true,
  });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'live' | 'test'>('live');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; confirmText: string;
    variant: 'danger' | 'warning' | 'default'; onConfirm: () => Promise<void>;
  } | null>(null);

  // Workspace settings state
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceNotificationEmail, setWorkspaceNotificationEmail] = useState('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isSavingWorkspaceName, setIsSavingWorkspaceName] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Billing state
  interface SubscriptionInfo {
    plan: string;
    status: string;
    billingInterval: 'monthly' | 'yearly' | null;
    limits: { submissions: number; forms: number; members: number };
    features: { analytics: boolean; teamMembers: boolean; apiAccess: boolean };
    usage: { submissions: number; forms: number; members: number };
    isTrialing: boolean;
    trialEndsAt: string | null;
  }
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [upgradingPriceType, setUpgradingPriceType] = useState<'monthly' | 'yearly' | null>(null);

  // Pricing plans from database
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);

  // Get Pro plan pricing from database
  const proPlan = pricingPlans.find(p => p.slug === 'pro');
  const starterPlan = pricingPlans.find(p => p.slug === 'starter');
  const monthlyPrice = proPlan?.monthlyPrice ?? 15;
  const yearlyPrice = proPlan?.yearlyPrice ?? 12.50;
  const yearlyTotal = Math.round(yearlyPrice * 12);

  const user = session?.user;
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  // Initialize profile form
  useEffect(() => {
    if (user?.name) {
      const parts = user.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user?.name]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && SETTINGS_TAB_IDS.includes(tab as SettingsTab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  // Fetch notification settings
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.settings);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/api-keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchApiKeys();
    }
  }, [currentWorkspace, fetchApiKeys]);

  // Fetch subscription info
  const fetchSubscription = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoadingSubscription(true);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/subscription`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) {
      setIsLoadingSubscription(false);
      return;
    }
    fetchSubscription();
  }, [currentWorkspace, fetchSubscription]);

  // Fetch pricing plans from database
  useEffect(() => {
    setIsLoadingPricing(true);
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.plans) {
          setPricingPlans(data.plans);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingPricing(false));
  }, []);

  // Fetch workspace settings when workspace changes
  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/workspaces/${currentWorkspace.id}`)
      .then(res => res.json())
      .then(data => {
        setWorkspaceName(data.workspace?.name || '');
        setWorkspaceNotificationEmail(data.workspace?.notificationEmail || '');
      })
      .catch(console.error);
  }, [currentWorkspace]);

  const billingContentLoading = workspaceLoading || (!!currentWorkspace && isLoadingSubscription) || isLoadingPricing;

  const scrollBillingToHash = useCallback(() => {
    if (typeof window === 'undefined' || activeTab !== 'billing') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTab]);

  useLayoutEffect(() => {
    if (activeTab !== 'billing' || billingContentLoading) return;
    scrollBillingToHash();
  }, [activeTab, billingContentLoading, scrollBillingToHash]);

  useEffect(() => {
    if (activeTab !== 'billing' || billingContentLoading) return;
    const onHashChange = () => scrollBillingToHash();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeTab, billingContentLoading, scrollBillingToHash]);

  // Handle upgrade to Pro (monthly or yearly Stripe price)
  const handleUpgrade = async (priceType: 'monthly' | 'yearly') => {
    if (!currentWorkspace) return;
    setUpgradingPriceType(priceType);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: currentWorkspace.id, priceType }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setUpgradingPriceType(null);
    }
  };

  // Handle manage billing
  const handleManageBilling = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: currentWorkspace.id }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  // Start trial
  const handleStartTrial = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/subscription`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchSubscription();
      }
    } catch (error) {
      console.error('Error starting trial:', error);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName }),
      });

      if (response.ok) {
        await updateSession({ name: fullName });
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        const data = await response.json();
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle notification
  const handleToggleNotification = async (key: keyof NotificationSettings) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));

    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...notifications, [key]: newValue }),
      });
    } catch (error) {
      // Revert on error
      setNotifications((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  // Create API key
  const handleCreateApiKey = async () => {
    if (!currentWorkspace || !newKeyName.trim()) return;
    setIsCreatingKey(true);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), type: newKeyType }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.apiKey.key);
        await fetchApiKeys();
        setNewKeyName('');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Delete API key
  const handleDeleteApiKey = (keyId: string) => {
    if (!currentWorkspace) return;
    setConfirmAction({
      title: 'Delete API Key',
      message: 'This API key will stop working immediately. Any integrations using it will break.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/workspaces/${currentWorkspace.id}/api-keys/${keyId}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
          }
        } catch (error) {
          console.error('Error deleting API key:', error);
        }
      },
    });
  };

  // Copy API key
  const copyKey = (keyId: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = () => {
    if (!currentWorkspace) return;
    setConfirmAction({
      title: 'Delete Workspace',
      message: `"${currentWorkspace.name}" and all its forms, submissions, and data will be permanently deleted. This cannot be undone.`,
      confirmText: 'Delete Workspace',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            window.location.href = '/dashboard';
          }
        } catch {}
      },
    });
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;

    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (response.ok) {
        // Sign out and redirect to home
        window.location.href = '/api/auth/signout?callbackUrl=/';
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete account');
      }
    } catch (error) {
      alert('Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
    }
  };

  // Save workspace name
  const handleSaveWorkspaceName = async () => {
    if (!currentWorkspace || !workspaceName.trim()) return;
    setIsSavingWorkspaceName(true);
    setWorkspaceMessage(null);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (response.ok) {
        setWorkspaceMessage({ type: 'success', text: 'Workspace name updated' });
        // Refresh workspace context
        window.location.reload();
      } else {
        const data = await response.json();
        setWorkspaceMessage({ type: 'error', text: data.error || 'Failed to update name' });
      }
    } catch (error) {
      setWorkspaceMessage({ type: 'error', text: 'Failed to update name' });
    } finally {
      setIsSavingWorkspaceName(false);
    }
  };

  // Save workspace settings
  const handleSaveWorkspace = async () => {
    if (!currentWorkspace) return;
    setIsSavingWorkspace(true);
    setWorkspaceMessage(null);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEmail: workspaceNotificationEmail || null,
        }),
      });

      if (response.ok) {
        setWorkspaceMessage({ type: 'success', text: 'Workspace settings saved' });
      } else {
        const data = await response.json();
        setWorkspaceMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setWorkspaceMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile Dropdown */}
        <div className="lg:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
            className="w-full h-12 px-4 text-base bg-white border border-gray-300 rounded-lg outline-none focus:border-safety-orange"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                activeTab === tab.id
                  ? 'bg-safety-orange/10 text-safety-orange'
                  : 'text-gray-600 hover:text-safety-orange hover:bg-gray-100'
              )}
            >
              <tab.icon size={20} weight={activeTab === tab.id ? 'fill' : 'regular'} className={activeTab === tab.id ? 'text-safety-orange' : 'text-gray-500'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={user.name || 'Profile'}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ef6f2e] to-[#ee6018] flex items-center justify-center text-white font-bold text-2xl">
                        {userInitials}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user?.name || 'User'}</div>
                    <div className="text-sm text-gray-500">{user?.email || ''}</div>
                  </div>
                </div>

                {profileMessage && (
                  <div
                    className={cn(
                      'mb-4 p-3 rounded-lg text-sm',
                      profileMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    )}
                  >
                    {profileMessage.text}
                  </div>
                )}

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="form-field md:col-span-2">
                    <label className="form-label">Email</label>
                    <input type="email" value={user?.email || ''} className="input" disabled />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="btn btn-primary"
                  >
                    {isSavingProfile ? (
                      <>
                        <Spinner size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'workspace' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Workspace Name */}
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Workspace Name</h2>

                {workspaceMessage && (
                  <div
                    className={cn(
                      'mb-4 p-3 rounded-lg text-sm',
                      workspaceMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    )}
                  >
                    {workspaceMessage.text}
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Workspace"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This name is shown in the workspace switcher and team invites.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveWorkspaceName}
                    disabled={isSavingWorkspaceName || !workspaceName.trim()}
                    className="btn btn-primary"
                  >
                    {isSavingWorkspaceName ? (
                      <>
                        <Spinner size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Name'
                    )}
                  </button>
                </div>
              </div>

              {/* Workspace Logo */}
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Workspace Logo</h2>
                <p className="text-sm text-gray-500 mb-4">Used in broadcast emails and branding. Recommended size: 200x50px.</p>
                {(() => {
                  const currentLogo = currentWorkspace?.logoUrl;
                  return (
                    <div className="flex items-center gap-4">
                      {currentLogo ? (
                        <div className="flex items-center gap-4">
                          <img src={currentLogo} alt="Logo" className="h-10 max-w-[200px] object-contain border border-gray-200 rounded-lg p-1" />
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/workspaces/${currentWorkspace?.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ logoUrl: null }),
                                });
                                window.location.reload();
                              } catch {}
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={async (e) => {
                            const input = (e.currentTarget as HTMLElement).querySelector('input');
                            input?.click();
                          }}
                          className="group inline-flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl px-8 py-5 text-center cursor-pointer transition-all hover:border-safety-orange/50 hover:bg-safety-orange/5"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-safety-orange/10 flex items-center justify-center mb-2 transition-colors">
                            <UploadSimple size={20} className="text-gray-400 group-hover:text-safety-orange transition-colors" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Upload logo</p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG or SVG</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('folder', 'logos');
                              try {
                                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                                const uploadData = await uploadRes.json();
                                if (uploadData.url && currentWorkspace?.id) {
                                  await fetch(`/api/workspaces/${currentWorkspace.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ logoUrl: uploadData.url }),
                                  });
                                  window.location.reload();
                                }
                              } catch {}
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Workspace Settings */}
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Workspace Settings</h2>

                <div className="form-field">
                  <label className="form-label">Notification Email</label>
                  <input
                    type="email"
                    value={workspaceNotificationEmail}
                    onChange={(e) => setWorkspaceNotificationEmail(e.target.value)}
                    placeholder="notifications@yourcompany.com"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Receive form submission notifications at this email instead of your account email.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveWorkspace}
                    disabled={isSavingWorkspace}
                    className="btn btn-primary"
                  >
                    {isSavingWorkspace ? (
                      <>
                        <Spinner size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              {/* Delete Workspace */}
              {currentWorkspace && !currentWorkspace.isPersonal && currentWorkspace.role === 'owner' && (
                <div className="card p-4 sm:p-6 border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-red-600">Delete Workspace</div>
                      <div className="text-xs text-gray-500">
                        Permanently delete this workspace and all its data
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteWorkspace}
                      className="btn bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 text-sm"
                    >
                      <Trash size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Email Notifications</h2>
                {isLoadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size={24} className="animate-spin text-gray-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { key: 'notifyNewSubmissions', label: 'New submissions', description: 'Get notified for each new form submission' },
                      { key: 'notifyWeeklyDigest', label: 'Weekly digest', description: 'Receive a weekly summary of form activity' },
                      { key: 'notifyFormErrors', label: 'Form errors', description: 'Get alerted when form submissions fail' },
                      { key: 'notifyTeamInvites', label: 'Team invites', description: 'Get notified when invites are sent or accepted' },
                      { key: 'notifyBilling', label: 'Billing', description: 'Upgrades, cancellations, and payment issues' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                        <div>
                          <div className="text-gray-900">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                        <button
                          onClick={() => handleToggleNotification(item.key as keyof NotificationSettings)}
                          className={cn(
                            'w-11 h-6 rounded-full relative transition-colors',
                            notifications[item.key as keyof NotificationSettings] ? 'bg-safety-orange' : 'bg-gray-300'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                              notifications[item.key as keyof NotificationSettings] ? 'translate-x-5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-gray-900">API Keys</h2>
                  <button
                    onClick={() => setShowCreateKeyModal(true)}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    Create Key
                  </button>
                </div>

                {isLoadingKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size={24} className="animate-spin text-gray-600" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No API keys yet. Create one to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">{key.name}</div>
                            <div className="text-xs text-gray-500">
                              Created {formatDate(key.createdAt)}
                              {key.lastUsedAt && ` / Last used ${formatDate(key.lastUsedAt)}`}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteApiKey(key.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-gray-100 rounded font-mono text-sm text-gray-600">
                            {key.maskedKey}
                          </code>
                          <button
                            onClick={() => copyKey(key.id, key.maskedKey)}
                            className="p-2 text-gray-500 hover:text-gray-700"
                          >
                            {copiedKey === key.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-4">API Documentation</h2>
                <p className="text-gray-500 mb-4">
                  Learn how to integrate Forma into your applications with our comprehensive API documentation.
                </p>
                <a href="/docs/api" className="btn btn-secondary inline-flex">
                  <Code size={18} />
                  View API Docs
                </a>
              </div>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {billingContentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size={24} className="animate-spin text-gray-600" />
                </div>
              ) : (
                <>
                  <div id="plans" className="scroll-mt-24 space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('compare-plans')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="group flex w-full max-w-xl items-center justify-between gap-3 rounded-lg text-left -mx-2 px-2 py-2 hover:bg-gray-100/60 active:bg-gray-100 transition-colors"
                    >
                      <span className="text-lg font-semibold text-gray-900">Plans</span>
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-500 group-hover:text-safety-orange">
                        Feature comparison
                        <CaretDown className="shrink-0 rotate-[-90deg]" size={14} weight="bold" />
                      </span>
                    </button>
                    <p className="text-sm text-gray-500">
                      Compare Free, trial, and Pro. Upgrade when you need more seats, analytics, and unlimited usage.
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Free */}
                      <div
                        className={cn(
                          'rounded-xl border p-5 flex flex-col bg-gray-50/80',
                          subscription?.plan === 'free'
                            ? 'border-[#ef6f2e]/40 ring-1 ring-[#ef6f2e]/20'
                            : 'border-gray-200'
                        )}
                      >
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                          {starterPlan?.name || 'Starter'}
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 mb-1">$0</div>
                        <div className="text-sm text-gray-500 mb-4">{starterPlan?.description || 'For testing and small projects'}</div>
                        <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                          {starterPlan?.features?.slice(0, 5).map((feature, i) => (
                            <li key={i} className={!feature.included ? 'text-gray-400' : ''}>
                              {feature.text}{!feature.included && ' —'}
                            </li>
                          )) || (
                            <>
                              <li>50 submissions / month</li>
                              <li>Up to 3 forms</li>
                              <li>Basic features</li>
                            </>
                          )}
                        </ul>
                        {subscription?.plan === 'free' ? (
                          <>
                            <div className="text-xs text-emerald-600/90 font-medium mb-3">Current plan</div>
                            <button
                              type="button"
                              onClick={handleStartTrial}
                              className="btn btn-secondary w-full"
                            >
                              Start 14-day trial
                            </button>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {subscription?.plan === 'trial'
                              ? 'Your workspace is on a Pro trial with higher limits.'
                              : 'Available when you are not on Pro.'}
                          </p>
                        )}
                      </div>

                      {/* Pro monthly */}
                      <div
                        id="pro-monthly"
                        className={cn(
                          'rounded-xl border p-5 flex flex-col bg-gray-50/80 scroll-mt-6 relative',
                          subscription?.plan === 'pro' && subscription?.billingInterval === 'monthly'
                            ? 'border-[#ef6f2e]/40 ring-1 ring-[#ef6f2e]/20'
                            : 'border-[#ef6f2e]/25'
                        )}
                      >
                        {proPlan?.popular && (
                          <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-safety-orange bg-safety-orange/10 px-2 py-0.5 rounded">
                            Popular
                          </div>
                        )}
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                          {proPlan?.name || 'Pro'}
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 mb-1">
                          ${monthlyPrice}/mo
                        </div>
                        <div className="text-sm text-gray-500 mb-4">{proPlan?.description || 'Billed monthly · cancel anytime'}</div>
                        <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                          {proPlan?.features?.filter(f => f.included).slice(0, 4).map((feature, i) => (
                            <li key={i}>{feature.text}</li>
                          )) || (
                            <>
                              <li>Unlimited submissions &amp; forms</li>
                              <li>Unlimited team members</li>
                              <li>Analytics, team invites, webhooks</li>
                            </>
                          )}
                        </ul>
                        {subscription?.plan === 'pro' && subscription?.billingInterval === 'monthly' ? (
                          <>
                            <div className="text-xs text-emerald-600/90 font-medium mb-3">Current plan</div>
                            <button
                              type="button"
                              onClick={handleManageBilling}
                              className="btn btn-secondary w-full"
                            >
                              Manage billing
                            </button>
                          </>
                        ) : subscription?.plan === 'pro' ? (
                          <button
                            type="button"
                            onClick={handleManageBilling}
                            className="btn btn-secondary w-full"
                          >
                            Switch to monthly
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgrade('monthly')}
                            disabled={upgradingPriceType !== null}
                            className="btn btn-primary w-full"
                          >
                            {upgradingPriceType === 'monthly' ? (
                              <>
                                <Spinner size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Upgrade to Pro — $${monthlyPrice}/mo`
                            )}
                          </button>
                        )}
                      </div>

                      {/* Pro yearly */}
                      <div
                        id="pro-yearly"
                        className={cn(
                          'rounded-xl border p-5 flex flex-col bg-gray-50/80 scroll-mt-6',
                          subscription?.plan === 'pro' && subscription?.billingInterval === 'yearly'
                            ? 'border-[#ef6f2e]/40 ring-1 ring-[#ef6f2e]/20'
                            : 'border-gray-200'
                        )}
                      >
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                          Pro
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 mb-1">
                          ${yearlyTotal}/yr
                        </div>
                        <div className="text-sm text-gray-500 mb-1">
                          ~${yearlyPrice}/mo billed annually
                        </div>
                        <div className="text-xs font-medium text-emerald-600/90 mb-4">
                          Save vs monthly
                        </div>
                        <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                          <li>Same features as Pro monthly</li>
                          <li>One payment per year</li>
                          <li>Best for committed teams</li>
                        </ul>
                        {subscription?.plan === 'pro' && subscription?.billingInterval === 'yearly' ? (
                          <>
                            <div className="text-xs text-emerald-600/90 font-medium mb-3">Current plan</div>
                            <button
                              type="button"
                              onClick={handleManageBilling}
                              className="btn btn-secondary w-full"
                            >
                              Manage billing
                            </button>
                          </>
                        ) : subscription?.plan === 'pro' ? (
                          <button
                            type="button"
                            onClick={handleManageBilling}
                            className="btn btn-secondary w-full"
                          >
                            Switch to yearly
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgrade('yearly')}
                            disabled={upgradingPriceType !== null}
                            className="btn btn-secondary w-full border-[#ef6f2e]/30 text-safety-orange hover:bg-safety-orange/10"
                          >
                            {upgradingPriceType === 'yearly' ? (
                              <>
                                <Spinner size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Upgrade Pro — $${yearlyTotal}/yr`
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    id="compare-plans"
                    className="card p-6 overflow-x-auto scroll-mt-24"
                  >
                    <h2 className="font-semibold text-gray-900 mb-4">Compare all plans</h2>
                    <div className="grid grid-cols-2 gap-8">
                      {/* Starter column */}
                      <div>
                        <h3 className="font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">{starterPlan?.name || 'Starter'}</h3>
                        <ul className="space-y-2 text-sm">
                          {starterPlan?.features?.map((f, i) => (
                            <li key={i} className={f.included ? 'text-gray-700' : 'text-gray-400'}>
                              {f.included ? '✓' : '—'} {f.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Pro column */}
                      <div>
                        <h3 className="font-medium text-safety-orange mb-1 pb-2 border-b border-gray-200">{proPlan?.name || 'Pro'}</h3>
                        <p className="text-xs text-gray-500 mb-3">Everything in {starterPlan?.name || 'Starter'}, plus:</p>
                        <ul className="space-y-2 text-sm">
                          {proPlan?.features?.filter(f => f.included).map((f, i) => (
                            <li key={i} className="text-gray-900">✓ {f.text}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4 sm:p-6">
                    <h2 className="font-semibold text-gray-900 mb-6">Your subscription</h2>
                    <div
                      className={cn(
                        'p-4 rounded-lg border mb-6',
                        subscription?.plan === 'pro'
                          ? 'bg-gradient-to-r from-[#ef6f2e]/10 to-[#ee6018]/10 border-[#ef6f2e]/30'
                          : subscription?.plan === 'trial'
                          ? 'bg-accent-100/10 border-accent-100/30'
                          : 'bg-gray-50 border-gray-200'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-gray-900 capitalize">
                            {subscription?.plan === 'pro' ? (proPlan?.name || 'Pro') : subscription?.plan === 'free' ? (starterPlan?.name || 'Starter') : subscription?.plan || 'Free'} plan
                          </div>
                          <div className="text-gray-600 text-sm">
                            {subscription?.plan === 'pro'
                              ? (proPlan?.description || 'For growing teams and businesses')
                              : subscription?.plan === 'trial'
                              ? `Trial ends ${subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString() : 'soon'}`
                              : (starterPlan?.description || `Up to ${subscription?.limits.submissions || 50} submissions this month`)}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'badge',
                            subscription?.status === 'active' || subscription?.status === 'trialing'
                              ? 'badge-success'
                              : 'badge-warning'
                          )}
                        >
                          {subscription?.isTrialing ? 'Trial' : subscription?.status || 'Active'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {subscription?.plan === 'free' && (
                        <>
                          <button
                            type="button"
                            onClick={handleStartTrial}
                            className="btn btn-secondary"
                          >
                            Start 14-day trial
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpgrade('monthly')}
                            disabled={upgradingPriceType !== null}
                            className="btn btn-primary"
                          >
                            {upgradingPriceType === 'monthly' ? (
                              <>
                                <Spinner size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Upgrade to Pro — $${monthlyPrice}/mo`
                            )}
                          </button>
                        </>
                      )}
                      {subscription?.plan === 'trial' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpgrade('monthly')}
                            disabled={upgradingPriceType !== null}
                            className="btn btn-primary"
                          >
                            {upgradingPriceType === 'monthly' ? (
                              <>
                                <Spinner size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Upgrade to Pro — $${monthlyPrice}/mo`
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpgrade('yearly')}
                            disabled={upgradingPriceType !== null}
                            className="btn btn-secondary"
                          >
                            {upgradingPriceType === 'yearly' ? (
                              <>
                                <Spinner size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Pro annual — $${yearlyTotal}/yr`
                            )}
                          </button>
                        </>
                      )}
                      {subscription?.plan === 'pro' && (
                        <button
                          type="button"
                          onClick={handleManageBilling}
                          className="btn btn-secondary"
                        >
                          Manage billing
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="card p-4 sm:p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Usage This Month</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Submissions</span>
                          <span className="text-gray-900">
                            {subscription?.usage.submissions || 0}
                            {subscription?.limits.submissions !== -1 && ` / ${subscription?.limits.submissions}`}
                            {subscription?.limits.submissions === -1 && ' (Unlimited)'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-safety-orange rounded-full"
                            style={{
                              width: subscription?.limits.submissions === -1
                                ? '0%'
                                : `${Math.min(100, ((subscription?.usage.submissions || 0) / (subscription?.limits.submissions || 1)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Forms</span>
                          <span className="text-gray-900">
                            {subscription?.usage.forms || 0}
                            {subscription?.limits.forms !== -1 && ` / ${subscription?.limits.forms}`}
                            {subscription?.limits.forms === -1 && ' (Unlimited)'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-safety-orange rounded-full"
                            style={{
                              width: subscription?.limits.forms === -1
                                ? '0%'
                                : `${Math.min(100, ((subscription?.usage.forms || 0) / (subscription?.limits.forms || 1)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Team Members</span>
                          <span className="text-gray-900">
                            {subscription?.usage.members || 0}
                            {subscription?.limits.members !== -1 && ` / ${subscription?.limits.members}`}
                            {subscription?.limits.members === -1 && ' (Unlimited)'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-safety-orange rounded-full"
                            style={{
                              width: subscription?.limits.members === -1
                                ? '0%'
                                : `${Math.min(100, ((subscription?.usage.members || 0) / (subscription?.limits.members || 1)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Connect - Payment Account */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Account</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Connect your Stripe account to receive payments from forms with payment fields. Forma takes a 5% platform fee.
                    </p>
                    <StripeConnectSection workspaceId={currentWorkspace?.id || ''} />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="card p-4 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-6">Change Password</h2>

                {passwordMessage && (
                  <div
                    className={cn(
                      'mb-4 p-3 rounded-lg text-sm',
                      passwordMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    )}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <div className="space-y-4 max-w-md">
                  <div className="form-field">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="btn btn-primary"
                  >
                    {isChangingPassword ? (
                      <>
                        <Spinner size={16} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </div>

              <div className="card p-4 sm:p-6 border-red-500/20">
                <h2 className="font-semibold text-red-600 mb-6">Danger Zone</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-900">Delete Account</div>
                      <div className="text-sm text-gray-500">
                        Permanently delete your account and all data
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteAccountModal(true)}
                      className="btn bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30"
                    >
                      <Trash size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
              <p className="text-sm text-gray-500">
                {newlyCreatedKey
                  ? 'Copy your API key now. You won\'t be able to see it again!'
                  : 'Give your API key a name to identify it later.'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {newlyCreatedKey ? (
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                    <Warning size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-600">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-gray-50 rounded font-mono text-sm text-gray-900 break-all">
                      {newlyCreatedKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedKey);
                        setCopiedKey('new');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      {copiedKey === 'new' ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label className="form-label">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production Key"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Key Type</label>
                    <select
                      value={newKeyType}
                      onChange={(e) => setNewKeyType(e.target.value as 'live' | 'test')}
                      className="input"
                    >
                      <option value="live">Live (Production)</option>
                      <option value="test">Test (Development)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateKeyModal(false);
                  setNewKeyName('');
                  setNewlyCreatedKey(null);
                }}
                className="btn btn-secondary"
              >
                {newlyCreatedKey ? 'Done' : 'Cancel'}
              </button>
              {!newlyCreatedKey && (
                <button
                  onClick={handleCreateApiKey}
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="btn btn-primary"
                >
                  {isCreatingKey ? (
                    <>
                      <Spinner size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Key'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-red-600">Delete Account</h2>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. This will permanently delete your account and remove all associated data.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This will permanently delete:
                </p>
                <ul className="text-sm text-red-600 mt-2 ml-4 list-disc space-y-1">
                  <li>Your account and profile</li>
                  <li>All workspaces you own</li>
                  <li>All forms and submissions</li>
                  <li>All integrations and API keys</li>
                </ul>
              </div>
              <div className="form-field">
                <label className="form-label">
                  To confirm, type <span className="text-red-600 font-semibold">delete</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete"
                  className="input border-red-300 focus:border-red-500"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmText('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmText.toLowerCase() !== 'delete'}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingAccount ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash size={16} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={async () => {
            await confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          variant={confirmAction.variant}
        />
      )}
    </div>
  );
}
