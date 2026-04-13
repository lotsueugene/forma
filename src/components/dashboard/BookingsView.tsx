'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  Clock,
  CaretLeft,
  CaretRight,
  User,
  X,
  File as FileIcon,
  CaretDown,
  Prohibit,
  Trash,
  Plus,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Submission {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface BookingBlock {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  fieldId: string;
}

interface BookingsViewProps {
  submissions: Submission[];
  bookingFieldIds: string[];
  fields: Array<{ id: string; type: string; label: string }>;
  formId: string;
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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function extractName(data: Record<string, unknown>, fields: Array<{ id: string; type: string; label: string }>): string {
  const nameField = fields.find(f => f.type === 'text' && /name/i.test(f.label));
  if (nameField && data[nameField.id]) return String(data[nameField.id]);
  const firstText = fields.find(f => f.type === 'text');
  if (firstText && data[firstText.id]) return String(data[firstText.id]);
  return 'Unknown';
}

function extractEmail(data: Record<string, unknown>, fields: Array<{ id: string; type: string; label: string }>): string {
  const emailField = fields.find(f => f.type === 'email');
  if (emailField && data[emailField.id]) return String(data[emailField.id]);
  return '';
}

export default function BookingsView({ submissions, bookingFieldIds, fields, formId }: BookingsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Booking blocks (owner-set unavailability)
  const [blocks, setBlocks] = useState<BookingBlock[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockWholeDay, setBlockWholeDay] = useState(true);
  const [savingBlock, setSavingBlock] = useState(false);

  // Fetch blocks
  useEffect(() => {
    fetch(`/api/forms/${formId}/blocks`)
      .then(res => res.ok ? res.json() : { blocks: [] })
      .then(data => setBlocks(data.blocks || []))
      .catch(() => {});
  }, [formId]);

  const addBlock = async () => {
    if (!blockDate) return;
    setSavingBlock(true);
    try {
      const res = await fetch(`/api/forms/${formId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: bookingFieldIds[0],
          date: blockDate,
          startTime: blockWholeDay ? null : blockStartTime || null,
          endTime: blockWholeDay ? null : blockEndTime || null,
          reason: blockReason || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(prev => [...prev, data.block]);
        setBlockDate('');
        setBlockStartTime('');
        setBlockEndTime('');
        setBlockReason('');
        setShowBlockForm(false);
      }
    } catch {}
    setSavingBlock(false);
  };

  const removeBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}/blocks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      });
      if (res.ok) {
        setBlocks(prev => prev.filter(b => b.id !== blockId));
      }
    } catch {}
  };

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

  // Total slot count
  const totalSlots = bookingEntries.reduce((s, e) => s + e.slots.length, 0);

  // Calendar days
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    const days: Array<{ date: Date; dateStr: string; inMonth: boolean; isToday: boolean; slotCount: number }> = [];

    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1);
      days.push({ date: d, dateStr: toDateStr(d), inMonth: false, isToday: false, slotCount: 0 });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = toDateStr(d);
      const entries = bookingsByDate[dateStr] || [];
      const slotCount = entries.reduce((s, e) => s + e.slots.length, 0);
      days.push({ date: d, dateStr, inMonth: true, isToday: dateStr === todayStr, slotCount });
    }

    return days;
  }, [viewMonth, bookingsByDate]);

  // Entries for selected date
  const selectedEntries = selectedDate ? (bookingsByDate[selectedDate] || []) : [];

  // Timeline
  const DAY_START = 0;
  const DAY_END = 24;
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

  // Auto-select first date with bookings if none selected
  const handleDateClick = (dateStr: string) => {
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
    setExpandedSubmissionId(null);
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span><strong className="text-gray-900">{bookingEntries.length}</strong> booking{bookingEntries.length !== 1 ? 's' : ''}</span>
        <span><strong className="text-gray-900">{totalSlots}</strong> time slot{totalSlots !== 1 ? 's' : ''}</span>
        <span><strong className="text-gray-900">{Object.keys(bookingsByDate).length}</strong> day{Object.keys(bookingsByDate).length !== 1 ? 's' : ''}</span>
      </div>

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
              onClick={() => day.inMonth && handleDateClick(day.dateStr)}
              disabled={!day.inMonth}
              className={cn(
                'relative h-12 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center',
                !day.inMonth && 'invisible',
                day.isToday && selectedDate !== day.dateStr && 'ring-2 ring-safety-orange',
                selectedDate === day.dateStr
                  ? 'bg-safety-orange text-white'
                  : day.slotCount > 0
                  ? 'bg-safety-orange/10 text-gray-900 hover:bg-safety-orange/20'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {day.date.getDate()}
              {day.slotCount > 0 && selectedDate !== day.dateStr && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(day.slotCount, 3) }).map((_, j) => (
                    <div key={j} className="w-1 h-1 rounded-full bg-safety-orange" />
                  ))}
                  {day.slotCount > 3 && (
                    <span className="text-[8px] text-safety-orange ml-0.5">+{day.slotCount - 3}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected date detail */}
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {selectedEntries.reduce((s, e) => s + e.slots.length, 0)} slots
                </span>
                <button type="button" onClick={() => setSelectedDate(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Timeline */}
            {selectedEntries.length > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
                </div>
                <div className="relative h-8 rounded-lg bg-gray-100 overflow-hidden">
                  {selectedEntries.flatMap(entry =>
                    entry.slots.map((slot, si) => (
                      <div
                        key={`${entry.submissionId}-${si}`}
                        className="absolute top-0 h-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          ...getSlotStyle(slot),
                          backgroundColor: expandedSubmissionId === entry.submissionId ? '#ef6f2e' : '#ef6f2eaa',
                        }}
                        onClick={() => setExpandedSubmissionId(expandedSubmissionId === entry.submissionId ? null : entry.submissionId)}
                        title={`${entry.name}: ${fmt(slot.start)} - ${fmt(slot.end)}`}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Booking entries for this date */}
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No bookings on this date</p>
            ) : (
              <div className="space-y-2">
                {[...selectedEntries].sort((a, b) => {
                  const aStart = a.slots[0]?.start || '99:99';
                  const bStart = b.slots[0]?.start || '99:99';
                  return aStart.localeCompare(bStart);
                }).map(entry => {
                  const isExpanded = expandedSubmissionId === entry.submissionId;
                  return (
                    <div key={entry.submissionId} className="rounded-xl border border-gray-200 overflow-hidden">
                      {/* Entry header — always visible */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : entry.submissionId)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                          isExpanded ? 'bg-safety-orange/5' : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{entry.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.slots.map((slot, si) => (
                                <span key={si} className="inline-flex items-center gap-1 text-xs text-safety-orange">
                                  <Clock size={12} />
                                  {fmt(slot.start)} – {fmt(slot.end)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <CaretDown
                          size={16}
                          className={cn('text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
                        />
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {fields
                                  .filter(f => f.type !== 'booking' && f.type !== 'page_break' && f.type !== 'hidden')
                                  .map(field => {
                                    const value = entry.data[field.id];
                                    if (!value && value !== 0) return null;

                                    let displayValue: React.ReactNode = String(value);

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
                                        <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</div>
                                        <div className="text-sm text-gray-900">{displayValue}</div>
                                      </div>
                                    );
                                  })}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-200">
                                Submitted {new Date(entry.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state — no date selected and no bookings */}
      {!selectedDate && bookingEntries.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarCheck size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No bookings yet</h3>
          <p className="text-gray-500">Bookings will appear here when users submit the form.</p>
        </div>
      )}

      {/* Hint when no date selected but there are bookings */}
      {!selectedDate && bookingEntries.length > 0 && (
        <p className="text-sm text-gray-400 text-center">
          Click a date with dots to see bookings
        </p>
      )}

      {/* Blocked times management */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Prohibit size={18} />
            Date Overrides
          </h3>
          <button
            type="button"
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="btn btn-secondary text-sm"
          >
            <Plus size={14} />
            Block Date
          </button>
        </div>

        {showBlockForm && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Lunch, Day off"
                  className="input w-full"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={blockWholeDay}
                onChange={(e) => setBlockWholeDay(e.target.checked)}
                className="w-4 h-4"
              />
              Block entire day
            </label>
            {!blockWholeDay && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="input flex-1"
                />
                <span className="text-sm text-gray-400">to</span>
                <input
                  type="time"
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="input flex-1"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addBlock}
                disabled={!blockDate || savingBlock}
                className="btn btn-primary text-sm"
              >
                {savingBlock ? 'Saving...' : 'Add Block'}
              </button>
              <button
                type="button"
                onClick={() => setShowBlockForm(false)}
                className="btn btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {blocks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div>
                    <span className="text-sm text-gray-800 font-medium">
                      {new Date(block.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {block.startTime && block.endTime ? (
                      <span className="text-sm text-gray-500 ml-2">
                        {fmt(block.startTime)} - {fmt(block.endTime)}
                      </span>
                    ) : (
                      <span className="text-xs text-red-500 ml-2">All day</span>
                    )}
                    {block.reason && (
                      <span className="text-xs text-gray-400 ml-2">&middot; {block.reason}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No date overrides. Your weekly schedule applies to all dates.</p>
        )}
      </div>
    </div>
  );
}
