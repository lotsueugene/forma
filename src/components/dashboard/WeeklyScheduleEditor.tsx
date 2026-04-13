'use client';

import { useState } from 'react';
import { Plus, X, Copy, Check } from '@phosphor-icons/react';

interface TimeBlock {
  start: string;
  end: string;
}

type WeeklySchedule = Record<number, TimeBlock[]>;

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

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getTimeOptions(): string[] {
  const opts: string[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    opts.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return opts;
}

const TIME_OPTIONS = getTimeOptions();

interface Props {
  value?: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export default function WeeklyScheduleEditor({ value, onChange }: Props) {
  const schedule = value || EMPTY_SCHEDULE;
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);

  const ensureSchedule = (): WeeklySchedule => {
    const s = { ...schedule };
    for (let d = 0; d < 7; d++) {
      if (!s[d]) s[d] = [];
    }
    return s;
  };

  const updateDay = (day: number, blocks: TimeBlock[]) => {
    const s = ensureSchedule();
    onChange({ ...s, [day]: blocks });
  };

  const toggleDay = (day: number, enabled: boolean) => {
    if (enabled) {
      updateDay(day, [{ start: '09:00', end: '17:00' }]);
    } else {
      updateDay(day, []);
    }
  };

  const addBlock = (day: number) => {
    const blocks = schedule[day] || [];
    const lastEnd = blocks.length > 0 ? blocks[blocks.length - 1].end : '08:00';
    const [h] = lastEnd.split(':').map(Number);
    const newStart = `${Math.min(h + 1, 23).toString().padStart(2, '0')}:00`;
    const newEnd = `${Math.min(h + 2, 24).toString().padStart(2, '0')}:00`;
    updateDay(day, [...blocks, { start: newStart, end: newEnd }]);
  };

  const removeBlock = (day: number, index: number) => {
    const blocks = [...(schedule[day] || [])];
    blocks.splice(index, 1);
    updateDay(day, blocks);
  };

  const updateBlock = (day: number, index: number, field: 'start' | 'end', val: string) => {
    const blocks = [...(schedule[day] || [])];
    blocks[index] = { ...blocks[index], [field]: val };
    updateDay(day, blocks);
  };

  const applyToAll = (fromDay: number) => {
    const blocks = schedule[fromDay] || [];
    const s = ensureSchedule();
    for (let d = 0; d < 7; d++) {
      s[d] = blocks.map(b => ({ ...b }));
    }
    onChange(s);
    setCopiedFrom(fromDay);
    setTimeout(() => setCopiedFrom(null), 1500);
  };

  return (
    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const blocks = schedule[day] || [];
        const isActive = blocks.length > 0;

        return (
          <div key={day} className="flex items-start gap-3 px-4 py-3">
            {/* Checkbox + Day name */}
            <label className="flex items-center gap-2.5 w-20 shrink-0 pt-1.5 cursor-pointer select-none">
              <div
                className={`w-4.5 h-4.5 rounded flex items-center justify-center border-2 transition-colors ${
                  isActive
                    ? 'bg-safety-orange border-safety-orange'
                    : 'border-gray-300 bg-white'
                }`}
                onClick={() => toggleDay(day, !isActive)}
              >
                {isActive && <Check size={10} weight="bold" className="text-white" />}
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {DAY_SHORT[day]}
              </span>
            </label>

            {/* Time blocks or "Unavailable" */}
            <div className="flex-1 min-w-0">
              {isActive ? (
                <div className="space-y-2">
                  {blocks.map((block, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={block.start}
                        onChange={(e) => updateBlock(day, i, 'start', e.target.value)}
                        className="input py-1.5 px-2.5 text-sm flex-1 min-w-0"
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={t} value={t}>{formatTime(t)}</option>
                        ))}
                      </select>
                      <span className="text-gray-400 text-xs font-medium">to</span>
                      <select
                        value={block.end}
                        onChange={(e) => updateBlock(day, i, 'end', e.target.value)}
                        className="input py-1.5 px-2.5 text-sm flex-1 min-w-0"
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={t} value={t}>{formatTime(t)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeBlock(day, i)}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-0.5">
                    <button
                      type="button"
                      onClick={() => addBlock(day)}
                      className="text-xs text-safety-orange hover:text-accent-200 font-medium flex items-center gap-1"
                    >
                      <Plus size={11} weight="bold" />
                      Add hours
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToAll(day)}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1"
                    >
                      <Copy size={11} />
                      {copiedFrom === day ? 'Applied!' : 'Apply to all'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 pt-1.5">Unavailable</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_SCHEDULE, EMPTY_SCHEDULE, DAY_NAMES, DAY_SHORT };
export type { WeeklySchedule, TimeBlock };
