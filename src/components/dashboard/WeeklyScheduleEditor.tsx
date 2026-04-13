'use client';

import { useState } from 'react';
import { Plus, X, Copy } from '@phosphor-icons/react';

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
    <div className="space-y-1">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const blocks = schedule[day] || [];
        const isActive = blocks.length > 0;

        return (
          <div
            key={day}
            className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
          >
            {/* Day label */}
            <div className="w-12 shrink-0 mt-1.5">
              <span className={`text-xs font-semibold ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                {DAY_SHORT[day]}
              </span>
            </div>

            {/* Time blocks */}
            <div className="flex-1 min-w-0">
              {blocks.map((block, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1.5">
                  <select
                    value={block.start}
                    onChange={(e) => updateBlock(day, i, 'start', e.target.value)}
                    className="input py-1.5 px-2 text-xs flex-1 min-w-0"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  <span className="text-gray-300 text-xs">–</span>
                  <select
                    value={block.end}
                    onChange={(e) => updateBlock(day, i, 'end', e.target.value)}
                    className="input py-1.5 px-2 text-xs flex-1 min-w-0"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBlock(day, i)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addBlock(day)}
                  className="text-[11px] text-safety-orange hover:text-accent-200 flex items-center gap-0.5"
                >
                  <Plus size={10} />
                  {isActive ? 'Add' : 'Set hours'}
                </button>
                {isActive && (
                  <button
                    type="button"
                    onClick={() => applyToAll(day)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                  >
                    <Copy size={10} />
                    {copiedFrom === day ? 'Applied!' : 'Apply to all'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_SCHEDULE, EMPTY_SCHEDULE, DAY_NAMES, DAY_SHORT };
export type { WeeklySchedule, TimeBlock };
