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

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Generate time options in 30-min intervals
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
  // Use default if no schedule or if all days are empty (misconfigured)
  const hasAnyBlocks = value && Object.values(value).some(blocks => blocks.length > 0);
  const schedule = hasAnyBlocks ? value : DEFAULT_SCHEDULE;
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);

  const updateDay = (day: number, blocks: TimeBlock[]) => {
    onChange({ ...schedule, [day]: blocks });
  };

  const toggleDay = (day: number) => {
    if (schedule[day]?.length > 0) {
      updateDay(day, []);
    } else {
      updateDay(day, [{ start: '09:00', end: '17:00' }]);
    }
  };

  const addBlock = (day: number) => {
    const blocks = schedule[day] || [];
    // Find a gap after the last block
    const lastEnd = blocks.length > 0 ? blocks[blocks.length - 1].end : '09:00';
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

  const copyToAll = (fromDay: number) => {
    const blocks = schedule[fromDay] || [];
    const newSchedule = { ...schedule };
    for (let d = 0; d < 7; d++) {
      if (d !== fromDay) {
        newSchedule[d] = blocks.map(b => ({ ...b }));
      }
    }
    onChange(newSchedule);
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
            {/* Day toggle */}
            <button
              type="button"
              onClick={() => toggleDay(day)}
              className={`w-16 shrink-0 py-1.5 rounded-md text-xs font-semibold transition-colors mt-0.5 ${
                isActive
                  ? 'bg-safety-orange text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {DAY_SHORT[day]}
            </button>

            {/* Time blocks or "Unavailable" */}
            <div className="flex-1 min-w-0">
              {isActive ? (
                <div className="space-y-1.5">
                  {blocks.map((block, i) => (
                    <div key={i} className="flex items-center gap-1.5">
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
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToAll(day)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                    >
                      <Copy size={10} />
                      {copiedFrom === day ? 'Applied!' : 'Apply to all'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1.5">Unavailable</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_SCHEDULE, DAY_NAMES, DAY_SHORT };
export type { WeeklySchedule, TimeBlock };
