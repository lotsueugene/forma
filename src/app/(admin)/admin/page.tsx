'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users,
  Briefcase,
  FileText,
  EnvelopeSimple,
  CurrencyDollar,
  TrendUp,
  Spinner,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalForms: number;
  totalSubmissions: number;
  mrr: number;
  recentSignups: number;
  planBreakdown: {
    free: number;
    trial: number;
    pro: number;
  };
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    fetch('/api/admin')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load admin stats</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    { label: 'Workspaces', value: stats.totalWorkspaces, icon: Briefcase },
    { label: 'Forms', value: stats.totalForms, icon: FileText },
    { label: 'Submissions', value: stats.totalSubmissions, icon: EnvelopeSimple },
    { label: 'MRR', value: `$${stats.mrr}`, icon: CurrencyDollar },
    { label: 'Signups (30d)', value: stats.recentSignups, icon: TrendUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Overview</h1>
        <p className="text-gray-600">Platform-wide statistics and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <div className="p-2 rounded-lg w-fit mb-3 bg-gray-100">
              <stat.icon size={18} className="text-gray-600" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {[
              { plan: 'Free', count: stats.planBreakdown.free, color: 'bg-gray-400' },
              { plan: 'Trial', count: stats.planBreakdown.trial, color: 'bg-gray-400' },
              { plan: 'Pro', count: stats.planBreakdown.pro, color: 'bg-safety-orange' },
            ].map((item) => {
              const total = stats.planBreakdown.free + stats.planBreakdown.trial + stats.planBreakdown.pro;
              const percentage = total > 0 ? (item.count / total) * 100 : 0;

              return (
                <div key={item.plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.plan}</span>
                    <span className="text-sm text-gray-500">{item.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className={cn('h-full rounded-full', item.color)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Signups</h2>
            <Link href="/admin/users" className="text-sm text-[#ef6f2e] hover:text-[#ee6018]">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">{user.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/announcements" className="btn btn-secondary">
            Create Announcement
          </Link>
          <Link href="/admin/broadcasts" className="btn btn-secondary">
            Send Email Broadcast
          </Link>
          <Link href="/admin/users" className="btn btn-secondary">
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
}
