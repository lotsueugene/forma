'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Spinner,
  TrendUp,
  TrendDown,
  Globe,
  MapPin,
  Clock,
  CalendarBlank,
  Users,
  Eye,
  Target,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalSubmissions: number;
    totalViews: number;
    conversionRate: string;
    recentSubmissions: number;
    submissionsTrend: string;
  };
  charts: {
    daily: Array<{ date: string; submissions: number }>;
    hourly: number[];
    weekday: number[];
  };
  geo: {
    countries: Array<{ country: string; code: string; count: number }>;
    continents: Array<{ continent: string; count: number }>;
    topCities: Array<{ city: string; count: number }>;
    hasGeoData: boolean;
  };
}

const COLORS = ['#ef6f2e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FormAnalytics({ formId }: { formId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [formId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={32} className="text-safety-orange animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">{error || 'No analytics available'}</p>
      </div>
    );
  }

  const { overview, charts, geo } = data;
  const trend = parseFloat(overview.submissionsTrend);

  // Format daily data for display
  const formattedDaily = charts.daily.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  // Format hourly data
  const hourlyData = charts.hourly.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    submissions: count,
  }));

  // Format weekday data
  const weekdayData = charts.weekday.map((count, index) => ({
    day: WEEKDAYS[index],
    submissions: count,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Users size={18} />
            <span className="text-sm">Total Submissions</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {overview.totalSubmissions.toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Eye size={18} />
            <span className="text-sm">Total Views</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {overview.totalViews.toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Target size={18} />
            <span className="text-sm">Conversion Rate</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {overview.conversionRate}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CalendarBlank size={18} />
            <span className="text-sm">Last 7 Days</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-gray-900">
              {overview.recentSubmissions}
            </span>
            {trend !== 0 && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-sm font-medium',
                  trend > 0 ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {trend > 0 ? <TrendUp size={16} /> : <TrendDown size={16} />}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Submissions Over Time */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <h3 className="font-medium text-gray-800 mb-4">Submissions Over Time (Last 30 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedDaily}>
              <defs>
                <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef6f2e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef6f2e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: '#1f2937', fontWeight: 500 }}
              />
              <Area
                type="monotone"
                dataKey="submissions"
                stroke="#ef6f2e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSubmissions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Time Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-gray-500" />
            <h3 className="font-medium text-gray-800">Submissions by Hour</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="submissions" fill="#ef6f2e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekday Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarBlank size={20} className="text-gray-500" />
            <h3 className="font-medium text-gray-800">Submissions by Day</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="submissions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Geographic Data */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-gray-500" />
          <h3 className="font-medium text-gray-800">Geographic Distribution</h3>
        </div>

        {geo.hasGeoData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Continent Breakdown */}
            <div>
              <h4 className="text-sm text-gray-500 mb-3">By Continent</h4>
              {geo.continents.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={geo.continents}
                        dataKey="count"
                        nameKey="continent"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {geo.continents.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No data yet</p>
              )}
              <div className="mt-2 space-y-1">
                {geo.continents.slice(0, 4).map((c, i) => (
                  <div key={c.continent} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-gray-600">{c.continent}</span>
                    </div>
                    <span className="font-medium text-gray-800">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div>
              <h4 className="text-sm text-gray-500 mb-3">Top Countries</h4>
              <div className="space-y-2">
                {geo.countries.slice(0, 6).map((c, i) => (
                  <div key={c.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(c.code)}</span>
                      <span className="text-sm text-gray-600">{c.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-safety-orange rounded-full"
                          style={{
                            width: `${(c.count / geo.countries[0].count) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8 text-right">
                        {c.count}
                      </span>
                    </div>
                  </div>
                ))}
                {geo.countries.length === 0 && (
                  <p className="text-gray-400 text-sm">No country data yet</p>
                )}
              </div>
            </div>

            {/* Top Cities */}
            <div>
              <h4 className="text-sm text-gray-500 mb-3">Top Cities</h4>
              <div className="space-y-2">
                {geo.topCities.map((c, i) => (
                  <div key={c.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 truncate max-w-[150px]">
                        {c.city}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{c.count}</span>
                  </div>
                ))}
                {geo.topCities.length === 0 && (
                  <p className="text-gray-400 text-sm">No city data yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Globe size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No geographic data available yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Location data will appear after new submissions
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
