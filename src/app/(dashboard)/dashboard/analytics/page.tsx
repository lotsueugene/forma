'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ChartLineUp,
  TrendUp,
  TrendDown,
  EnvelopeSimple,
  Eye,
  Percent,
  FileText,
  ArrowRight,
  Spinner,
  Clock,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/workspace-context';

interface AnalyticsData {
  summary: {
    totalSubmissions: number;
    totalViews: number;
    activeForms: number;
    totalForms: number;
    avgConversion: number;
    submissionGrowth: number;
  };
  timeSeries: Array<{ date: string; submissions: number }>;
  formStats: Array<{
    id: string;
    name: string;
    status: string;
    submissions: number;
    views: number;
    conversion: number;
  }>;
  submissionsByForm: Array<{ name: string; value: number }>;
  submissionsByHour: Array<{ hour: string; submissions: number }>;
  period: string;
}

const COLORS = ['#ef6f2e', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const loadAnalytics = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics?workspaceId=${currentWorkspace.id}&period=${period}`
      );
      if (!res.ok) throw new Error('Failed to fetch analytics');

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <Spinner size={32} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Submissions',
      value: data.summary.totalSubmissions.toLocaleString(),
      icon: EnvelopeSimple,
      change: data.summary.submissionGrowth,
    },
    {
      label: 'Form Views',
      value: data.summary.totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Avg. Conversion',
      value: `${data.summary.avgConversion}%`,
      icon: Percent,
    },
    {
      label: 'Active Forms',
      value: data.summary.activeForms.toString(),
      icon: FileText,
    },
  ];

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  // Format date for chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your form performance and insights</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {p === '7d' ? '7D' : p === '30d' ? '30D' : '90D'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-gray-200 rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gray-100">
                <stat.icon size={20} className="text-gray-600" weight="duotone" />
              </div>
              {stat.change !== undefined && (
                <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                  {stat.change >= 0 ? (
                    <TrendUp size={16} weight="bold" />
                  ) : (
                    <TrendDown size={16} weight="bold" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions Over Time */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Submissions Over Time</h3>
              <p className="text-sm text-gray-500">{periodLabels[period]}</p>
            </div>
            <CalendarBlank size={20} className="text-gray-500" />
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeries}>
                <defs>
                  <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef6f2e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef6f2e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  stroke="#ef6f2e"
                  strokeWidth={2}
                  fill="url(#submissionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submissions by Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">By Form</h3>
            <ChartLineUp size={20} className="text-gray-500" />
          </div>
          {data.submissionsByForm.length > 0 ? (
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.submissionsByForm}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.submissionsByForm.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {data.submissionsByForm.slice(0, 3).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No submissions yet
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions by Hour */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Peak Hours</h3>
              <p className="text-sm text-gray-500">Submissions by hour of day</p>
            </div>
            <Clock size={20} className="text-gray-500" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.submissionsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="submissions" fill="#ef6f2e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Forms Table */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Top Performing Forms</h3>
            <Link
              href="/dashboard/forms"
              className="text-sm text-safety-orange hover:text-accent-200 flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {data.formStats.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.formStats.slice(0, 5).map((form, index) => (
                <Link
                  key={form.id}
                  href={`/dashboard/forms/${form.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors block"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-medium text-gray-500">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{form.name}</div>
                      <div className="text-xs text-gray-500">
                        {form.submissions.toLocaleString()} submissions • {form.views.toLocaleString()} views
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{form.conversion}%</div>
                    <div className="text-xs text-gray-500">conversion</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No forms yet
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {data.summary.totalSubmissions === 0 && data.summary.totalForms === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <ChartLineUp size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data yet</h3>
          <p className="text-gray-500 mb-4">
            Create a form and start collecting submissions to see your analytics.
          </p>
          <Link href="/dashboard/forms/new" className="btn btn-primary inline-flex">
            Create your first form
          </Link>
        </div>
      )}
    </div>
  );
}
