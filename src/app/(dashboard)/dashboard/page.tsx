'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Files,
  EnvelopeSimple,
  ChartLineUp,
  Eye,
  Plus,
  ArrowRight,
  Spinner,
  FileText,
  Rocket,
  Key,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';

interface Form {
  id: string;
  name: string;
  status: string;
  formType: string;
  views: number;
  submissions: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalForms: number;
  totalSubmissions: number;
  totalViews: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { currentWorkspace } = useWorkspace();
  const [forms, setForms] = useState<Form[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    totalSubmissions: 0,
    totalViews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(`/api/forms?workspaceId=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        const formsList = data.forms || [];
        setForms(formsList);

        // Calculate stats
        const totalSubmissions = formsList.reduce((acc: number, f: Form) => acc + f.submissions, 0);
        const totalViews = formsList.reduce((acc: number, f: Form) => acc + f.views, 0);

        setStats({
          totalForms: formsList.length,
          totalSubmissions,
          totalViews,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const userName = session?.user?.name?.split(' ')[0] || 'there';
  const recentForms = forms.slice(0, 4);
  const activeForms = forms.filter((f) => f.status === 'active').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-safety-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userName}. Here's your overview.</p>
        </div>
        <Link href="/dashboard/forms/new" className="btn btn-primary w-fit">
          <Plus size={18} weight="bold" />
          Create Form
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <Files size={20} className="text-gray-600" weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-gray-900 mb-1">
            {stats.totalForms}
          </div>
          <div className="text-sm text-gray-600">Total Forms</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <EnvelopeSimple size={20} className="text-gray-600" weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-gray-900 mb-1">
            {stats.totalSubmissions.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Submissions</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <ChartLineUp size={20} className="text-gray-600" weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-gray-900 mb-1">
            {activeForms}
          </div>
          <div className="text-sm text-gray-600">Active Forms</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <Eye size={20} className="text-gray-600" weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-gray-900 mb-1">
            {stats.totalViews.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Views</div>
        </motion.div>
      </div>

      {/* Recent Forms */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Forms</h2>
          {forms.length > 0 && (
            <Link
              href="/dashboard/forms"
              className="text-sm text-safety-orange hover:text-accent-200 flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {recentForms.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText size={32} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Create your first form to start collecting submissions
            </p>
            <Link href="/dashboard/forms/new" className="btn btn-primary">
              <Plus size={18} weight="bold" />
              Create Your First Form
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/forms/${form.id}`}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Files size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{form.name}</div>
                      <div className="text-sm text-gray-600">
                        {form.submissions} submission{form.submissions !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'badge mb-1',
                        form.status === 'active' ? 'badge-success' : 'badge-warning'
                      )}
                    >
                      {form.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {form.formType === 'endpoint' ? 'API Endpoint' : 'Form Builder'}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard/forms/new"
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <div className="p-2 rounded-lg bg-gray-100">
              <Plus size={18} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">New Form</div>
              <div className="text-xs text-gray-600">Start from scratch</div>
            </div>
          </Link>
          <Link
            href="/dashboard/team"
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <div className="p-2 rounded-lg bg-gray-100">
              <Rocket size={18} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Invite Team</div>
              <div className="text-xs text-gray-600">Collaborate together</div>
            </div>
          </Link>
          <Link
            href="/dashboard/settings?tab=api"
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <div className="p-2 rounded-lg bg-gray-100">
              <Key size={18} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">API Keys</div>
              <div className="text-xs text-gray-600">Developer access</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
