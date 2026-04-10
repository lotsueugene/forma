'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  Clock,
  CaretLeft,
  CaretRight,
  User,
  X,
  EnvelopeSimple,
  Phone,
  File as FileIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Submission {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface BookingsViewProps {
  submissions: Submission[];
  bookingFieldIds: string[];
  fields: Array<{ id: string; type: string; label: string }>;
}

interface BookingEntry {
  submissionId: string;
  date: string;
  slots: Array<{ start: string; end: string }>;
  name: string;
  email: string;
  data: Record<string, unknown>;
  createdAt: string;
}

function fmt(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ap}`;
}

function extractName(data: Record<string, unknown>, fields: Array<{ id: string; type: string; label: string }>): string {
  // Try to find a text field with "name" in the label
  const nameField = fields.find(f => f.type === 'text' && /name/i.test(f.label));
  if (nameField && data[nameField.id]) return String(data[nameField.id]);
  // Fallback to first text field
  const firstText = fields.find(f => f.type === 'text');
  if (firstText && data[firstText.id]) return String(data[firstText.id]);
  return 'Unknown';
}

function extractEmail(data: Record<string, unknown>, fields: Array<{ id: string; type: string; label: string }>): string {
  const emailField = fields.find(f => f.type === 'email');
  if (emailField && data[emailField.id]) return String(data[emailField.id]);
  return '';
}

export default function BookingsView({ submissions, bookingFieldIds, fields }: BookingsViewProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Extract all booking entries
  const bookingEntries = useMemo(() => {
    const entries: BookingEntry[] = [];
    for (const sub of submissions) {
      for (const fieldId of bookingFieldIds) {
        const val = sub.data[fieldId];
        if (!val) continue;
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          if (parsed?.date && Array.isArray(parsed.slots)) {
            entries.push({
              submissionId: sub.id,
              date: parsed.date,
              slots: parsed.slots,
              name: extractName(sub.data, fields),
              email: extractEmail(sub.data, fields),
              data: sub.data,
              createdAt: sub.createdAt,
            });
          }
        } catch {}
      }
    }
    return entries;
  }, [submissions, bookingFieldIds, fields]);

  // Group by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, BookingEntry[]> = {};
    for (const entry of bookingEntries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return map;
  }, [bookingEntries]);

  // Selected submission's booking
  const selectedEntry = selectedSubmissionId
    ? bookingEntries.find(e => e.submissionId === selectedSubmissionId) || null
    : null;

  // Calendar days
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{ date: Date; dateStr: string; inMonth: boolean; isToday: boolean; bookingCount: number }> = [];

    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1);
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], inMonth: false, isToday: false, bookingCount: 0 });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];
      const bookings = bookingsByDate[dateStr] || [];
      // If a submission is selected, only count that submission's bookings
      const count = selectedSubmissionId
        ? bookings.filter(b => b.submissionId === selectedSubmissionId).reduce((sum, b) => sum + b.slots.length, 0)
        : bookings.reduce((sum, b) => sum + b.slots.length, 0);
      days.push({ date: d, dateStr, inMonth: true, isToday, bookingCount: count });
    }

    return days;
  }, [viewMonth, bookingsByDate, selectedSubmissionId]);

  // Slots to show for selected date (or all dates in current month)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const visibleSlots = useMemo(() => {
    const targetDate = selectedDate;
    if (!targetDate) return [];

    const entries = bookingsByDate[targetDate] || [];
    if (selectedSubmissionId) {
      return entries.filter(e => e.submissionId === selectedSubmissionId);
    }
    return entries;
  }, [selectedDate, bookingsByDate, selectedSubmissionId]);

  // Timeline rendering
  const DAY_START = 6;
  const DAY_END = 22;
  const totalMinutes = (DAY_END - DAY_START) * 60;

  const getSlotStyle = (slot: { start: string; end: string }) => {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    const startMin = sh * 60 + sm - DAY_START * 60;
    const endMin = eh * 60 + em - DAY_START * 60;
    return {
      left: `${Math.max(0, (startMin / totalMinutes) * 100)}%`,
      width: `${Math.max(2, ((endMin - startMin) / totalMinutes) * 100)}%`,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Submissions list */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Bookings ({bookingEntries.length})
        </h3>

        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {/* All bookings button */}
          <button
            type="button"
            onClick={() => { setSelectedSubmissionId(null); }}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm',
              !selectedSubmissionId
                ? 'bg-safety-orange/10 text-safety-orange border border-safety-orange/20'
                : 'hover:bg-gray-50 text-gray-600'
            )}
          >
            <div className="font-medium">All bookings</div>
            <div className="text-xs opacity-70">{bookingEntries.reduce((s, e) => s + e.slots.length, 0)} time slots</div>
          </button>

          {bookingEntries.map(entry => (
            <button
              key={entry.submissionId}
              type="button"
              onClick={() => {
                setSelectedSubmissionId(
                  selectedSubmissionId === entry.submissionId ? null : entry.submissionId
                );
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                selectedSubmissionId === entry.submissionId
                  ? 'bg-safety-orange/10 text-safety-orange border border-safety-orange/20'
                  : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{entry.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {entry.slots.map(s => `${fmt(s.start)}-${fmt(s.end)}`).join(', ')}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {bookingEntries.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No bookings yet
            </div>
          )}
        </div>
      </div>

      {/* Right: Calendar + details */}
      <div className="lg:col-span-2 space-y-4">
        {/* Calendar */}
        <div className="card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <CaretLeft size={18} />
            </button>
            <span className="font-semibold text-gray-900">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <CaretRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => day.inMonth && setSelectedDate(day.dateStr === selectedDate ? null : day.dateStr)}
                disabled={!day.inMonth}
                className={cn(
                  'relative h-12 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center',
                  !day.inMonth && 'invisible',
                  day.isToday && selectedDate !== day.dateStr && 'ring-2 ring-safety-orange',
                  selectedDate === day.dateStr
                    ? 'bg-safety-orange text-white'
                    : day.bookingCount > 0
                    ? 'bg-safety-orange/10 text-gray-900 hover:bg-safety-orange/20'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {day.date.getDate()}
                {day.bookingCount > 0 && selectedDate !== day.dateStr && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: Math.min(day.bookingCount, 3) }).map((_, j) => (
                      <div key={j} className="w-1 h-1 rounded-full bg-safety-orange" />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Day detail — timeline + slots */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <button type="button" onClick={() => setSelectedDate(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              {/* Timeline */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>10 PM</span>
                </div>
                <div className="relative h-8 rounded-lg bg-gray-100 overflow-hidden">
                  {visibleSlots.flatMap(entry =>
                    entry.slots.map((slot, si) => (
                      <div
                        key={`${entry.submissionId}-${si}`}
                        className="absolute top-0 h-full rounded"
                        style={{
                          ...getSlotStyle(slot),
                          backgroundColor: selectedSubmissionId ? '#ef6f2e' : '#ef6f2ecc',
                        }}
                        title={`${entry.name}: ${fmt(slot.start)} - ${fmt(slot.end)}`}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Slot list */}
              {visibleSlots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No bookings on this date</p>
              ) : (
                <div className="space-y-2">
                  {visibleSlots.flatMap(entry =>
                    entry.slots.map((slot, si) => (
                      <div
                        key={`${entry.submissionId}-${si}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedSubmissionId(entry.submissionId)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium bg-safety-orange/10 text-safety-orange">
                            <Clock size={14} />
                            {fmt(slot.start)} – {fmt(slot.end)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{entry.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected submission detail */}
        <AnimatePresence>
          {selectedEntry && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <User size={18} />
                  {selectedEntry.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields
                  .filter(f => f.type !== 'booking' && f.type !== 'page_break' && f.type !== 'hidden')
                  .map(field => {
                    const value = selectedEntry.data[field.id];
                    if (!value && value !== 0) return null;

                    let displayValue: React.ReactNode = String(value);

                    // File
                    if (typeof value === 'string') {
                      try {
                        const parsed = JSON.parse(value);
                        if (parsed?.url && parsed?.name) {
                          displayValue = (
                            <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="text-safety-orange hover:underline flex items-center gap-1.5 text-sm">
                              <FileIcon size={14} />
                              {parsed.name}
                            </a>
                          );
                        }
                      } catch {}
                    }

                    return (
                      <div key={field.id}>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{field.label}</div>
                        <div className="text-sm text-gray-900">{displayValue}</div>
                      </div>
                    );
                  })}
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                Submitted {new Date(selectedEntry.createdAt).toLocaleString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!selectedDate && !selectedEntry && bookingEntries.length === 0 && (
          <div className="card p-12 text-center">
            <CalendarCheck size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No bookings yet</h3>
            <p className="text-gray-500">Bookings will appear here when users submit the form.</p>
          </div>
        )}
      </div>
    </div>
  );
}
