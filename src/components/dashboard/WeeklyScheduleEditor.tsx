'use client';

import { useState } from 'react';
import { Plus, X, CalendarBlank } from '@phosphor-icons/react';
import TimeInput from '@/components/ui/TimeInput';

interface TimeBlock {
  start: string;
  end: string;
}

type WeeklySchedule = Record<number, TimeBlock[]>;

// A schedule entry groups days + time range for display
interface ScheduleEntry {
  id: string;
  days: number[]; // 0=Sun..6=Sat
  start: string;
  end: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SCHEDULE: WeeklySchedule = {
  0: [],
  1: [{ start: '09:00', end: '17:00' }],
  2: [{ start: '09:00', end: '17:00' }],
  3: [{ start: '09:00', end: '17:00' }],
  4: [{ start: '09:00', end: '17:00' }],
  5: [{ start: '09:00', end: '17:00' }],
  6: [],
};

const EMPTY_SCHEDULE: WeeklySchedule = {
  0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
};

function formatTime12(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDays(days: number[]): string {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Every day';

  const sorted = [...days].sort();

  // Check for Mon-Fri
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Mon - Fri';
  // Check for weekends
  if (sorted.length === 2 && sorted.join(',') === '0,6') return 'Sat - Sun';

  // Check for consecutive ranges
  if (sorted.length >= 3) {
    const isConsecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
    if (isConsecutive) return `${DAY_SHORT[sorted[0]]} - ${DAY_SHORT[sorted[sorted.length - 1]]}`;
  }

  return sorted.map(d => DAY_SHORT[d]).join(', ');
}

const genId = () => Math.random().toString(36).substring(2, 8);

// Convert WeeklySchedule to ScheduleEntries for display
function scheduleToEntries(schedule: WeeklySchedule): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  const processed = new Set<string>();

  for (let day = 0; day < 7; day++) {
    const blocks = schedule[day] || [];
    for (const block of blocks) {
      const key = `${block.start}-${block.end}`;
      if (processed.has(`${day}-${key}`)) continue;

      // Find other days with the same time block
      const matchingDays = [day];
      for (let d = day + 1; d < 7; d++) {
        const dBlocks = schedule[d] || [];
        if (dBlocks.some(b => b.start === block.start && b.end === block.end)) {
          matchingDays.push(d);
          processed.add(`${d}-${key}`);
        }
      }
      processed.add(`${day}-${key}`);

      entries.push({
        id: genId(),
        days: matchingDays,
        start: block.start,
        end: block.end,
      });
    }
  }

  return entries;
}

// Convert ScheduleEntries back to WeeklySchedule
function entriesToSchedule(entries: ScheduleEntry[]): WeeklySchedule {
  const schedule: WeeklySchedule = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const entry of entries) {
    for (const day of entry.days) {
      schedule[day].push({ start: entry.start, end: entry.end });
    }
  }
  // Sort blocks by start time for each day
  for (let d = 0; d < 7; d++) {
    schedule[d].sort((a, b) => a.start.localeCompare(b.start));
  }
  return schedule;
}

interface Props {
  value?: WeeklySchedule;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onChange: (schedule: WeeklySchedule) => void;
}

export default function WeeklyScheduleEditor({ value, enabled = false, onToggle, onChange }: Props) {
  const schedule = value || EMPTY_SCHEDULE;
  const [entries, setEntries] = useState<ScheduleEntry[]>(() => scheduleToEntries(schedule));

  // If enabled but no schedules, auto-correct to off
  const effectiveEnabled = enabled && entries.length > 0;
  const [adding, setAdding] = useState(false);
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

  const syncSchedule = (updated: ScheduleEntry[]) => {
    setEntries(updated);
    onChange(entriesToSchedule(updated));
  };

  const addEntry = () => {
    if (newDays.length === 0 || !newStart || !newEnd) return;
    const entry: ScheduleEntry = {
      id: genId(),
      days: [...newDays].sort(),
      start: newStart,
      end: newEnd,
    };
    syncSchedule([...entries, entry]);
    // Auto-enable availability when first schedule is added
    if (!enabled && onToggle) onToggle(true);
    setAdding(false);
    setNewDays([1, 2, 3, 4, 5]);
    setNewStart('09:00');
    setNewEnd('17:00');
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    syncSchedule(updated);
    // Auto-disable if no schedules left
    if (updated.length === 0 && enabled && onToggle) onToggle(false);
  };

  const toggleNewDay = (day: number) => {
    setNewDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleToggle = (on: boolean) => {
    if (onToggle) onToggle(on);
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      {onToggle && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Availability Rules</p>
            <p className="text-xs text-gray-400">
              {effectiveEnabled ? 'Restricts available time slots in fixed duration mode' : 'No restrictions — applies to fixed duration mode only'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(!effectiveEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              effectiveEnabled ? 'bg-safety-orange' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              effectiveEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      )}

      {/* Schedule entries */}
      {(effectiveEnabled || !onToggle) && (
        <div className="space-y-2">
          {entries.length > 0 && (
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarBlank size={16} className="text-safety-orange shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatDays(entry.days)}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime12(entry.start)} - {formatTime12(entry.end)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && !adding && (
            <p className="text-sm text-gray-400 py-2">
              {(effectiveEnabled || !onToggle) ? 'No schedules set. Add one to define your availability.' : ''}
            </p>
          )}

          {/* Add schedule form */}
          {adding ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              {/* Day selector */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_SHORT.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleNewDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        newDays.includes(i)
                          ? 'bg-safety-orange text-white'
                          : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time range */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Time</label>
                <div className="flex items-center gap-2">
                  <TimeInput
                    value={newStart}
                    onChange={setNewStart}
                    className="input py-1.5 px-2.5 text-sm flex-1"
                    placeholder="9:00 AM"
                  />
                  <span className="text-gray-400 text-xs font-medium">to</span>
                  <TimeInput
                    value={newEnd}
                    onChange={setNewEnd}
                    className="input py-1.5 px-2.5 text-sm flex-1"
                    placeholder="5:00 PM"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addEntry}
                  disabled={newDays.length === 0}
                  className="btn btn-primary text-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="btn btn-ghost text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-sm text-safety-orange hover:text-accent-200 font-medium flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              Add schedule
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { DEFAULT_SCHEDULE, EMPTY_SCHEDULE, DAY_NAMES, DAY_SHORT };
export type { WeeklySchedule, TimeBlock };
