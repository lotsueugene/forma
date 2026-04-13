'use client';

import { useState, useEffect, useMemo } from 'react';
import { CalendarBlank, Clock, CaretLeft, CaretRight, Check, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface BookingSlot {
  start: string; // "09:00"
  end: string;   // "10:30"
}

interface BookingFieldProps {
  formId: string;
  fieldId: string;
  value: string; // JSON string: { date: string, slots: BookingSlot[] }
  onChange: (value: string) => void;
  required?: boolean;
  accent?: string;
  textColor?: string;
  isLightBg?: boolean;
  bookingMode?: 'custom' | 'fixed';
  slotDuration?: number; // minutes
  startHour?: number; // 0-23
  endHour?: number;   // 1-24
}

// Business hours
const DAY_START = 0;  // 12 AM
const DAY_END = 24;   // 12 AM next day

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function slotsOverlap(a: BookingSlot, b: BookingSlot): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function BookingField({
  formId,
  fieldId,
  value,
  onChange,
  required,
  accent = '#ef6f2e',
  textColor = '#111827',
  isLightBg = true,
  bookingMode = 'custom',
  slotDuration = 30,
  startHour = 9,
  endHour = 17,
}: BookingFieldProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [existingBookings, setExistingBookings] = useState<Record<string, BookingSlot[]>>({});
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [userSlots, setUserSlots] = useState<BookingSlot[]>([]);
  const [error, setError] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch existing bookings for this form
  useEffect(() => {
    if (!formId) return;
    setLoadingBookings(true);
    fetch(`/api/public/forms/${formId}/bookings?fieldId=${fieldId}`)
      .then(res => res.ok ? res.json() : { bookings: {} })
      .then(data => setExistingBookings(data.bookings || {}))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [formId, fieldId]);

  // Parse initial value
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.date) setSelectedDate(parsed.date);
        if (parsed.slots) setUserSlots(parsed.slots);
      } catch {}
    }
  }, []);

  // Update parent whenever selections change
  useEffect(() => {
    if (selectedDate && userSlots.length > 0) {
      onChange(JSON.stringify({ date: selectedDate, slots: userSlots }));
    } else {
      onChange('');
    }
  }, [selectedDate, userSlots]);

  const bookedSlots = useMemo(() => {
    return [...(existingBookings[selectedDate] || [])].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );
  }, [existingBookings, selectedDate]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{ date: Date; inMonth: boolean; isPast: boolean; hasBookings: boolean }> = [];

    // Padding days from previous month
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1);
      days.push({ date: d, inMonth: false, isPast: true, hasBookings: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        inMonth: true,
        isPast: d < today,
        hasBookings: (existingBookings[dateStr] || []).length > 0,
      });
    }

    return days;
  }, [viewMonth, existingBookings]);

  const addSlot = () => {
    setError('');
    if (!startTime || !endTime) {
      setError('Select both start and end time');
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('End time must be after start time');
      return;
    }

    const newSlot: BookingSlot = { start: startTime, end: endTime };

    // Check overlap with existing bookings
    for (const booked of bookedSlots) {
      if (slotsOverlap(newSlot, booked)) {
        setError(`Overlaps with existing booking ${formatTime(booked.start)} - ${formatTime(booked.end)}`);
        return;
      }
    }

    // Check overlap with user's own slots
    for (const slot of userSlots) {
      if (slotsOverlap(newSlot, slot)) {
        setError(`Overlaps with your slot ${formatTime(slot.start)} - ${formatTime(slot.end)}`);
        return;
      }
    }

    setUserSlots(prev => [...prev, newSlot].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
    setStartTime('');
    setEndTime('');
  };

  const removeSlot = (index: number) => {
    setUserSlots(prev => prev.filter((_, i) => i !== index));
  };

  // Generate time options (30-min intervals for custom mode dropdowns)
  const timeOptions = useMemo(() => {
    const opts: string[] = [];
    for (let m = DAY_START * 60; m < DAY_END * 60; m += 30) {
      opts.push(minutesToTime(m));
    }
    return opts;
  }, []);

  // Generate fixed-duration slots grouped by time of day
  const fixedSlotGroups = useMemo(() => {
    if (bookingMode !== 'fixed') return [];
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    const groups: { label: string; slots: BookingSlot[] }[] = [];
    const morning: BookingSlot[] = [];
    const afternoon: BookingSlot[] = [];
    const evening: BookingSlot[] = [];

    for (let m = startMin; m + slotDuration <= endMin; m += slotDuration) {
      const slot = { start: minutesToTime(m), end: minutesToTime(m + slotDuration) };
      if (m < 12 * 60) morning.push(slot);
      else if (m < 17 * 60) afternoon.push(slot);
      else evening.push(slot);
    }

    if (morning.length > 0) groups.push({ label: 'Morning', slots: morning });
    if (afternoon.length > 0) groups.push({ label: 'Afternoon', slots: afternoon });
    if (evening.length > 0) groups.push({ label: 'Evening', slots: evening });

    return groups;
  }, [bookingMode, slotDuration, startHour, endHour]);

  // Check if a fixed slot is already booked
  const isSlotBooked = (slot: BookingSlot): boolean => {
    return bookedSlots.some(booked => slotsOverlap(slot, booked));
  };

  // Check if a fixed slot is selected by the user
  const isSlotSelected = (slot: BookingSlot): boolean => {
    return userSlots.some(s => s.start === slot.start && s.end === slot.end);
  };

  // Toggle a fixed slot
  const toggleFixedSlot = (slot: BookingSlot) => {
    if (isSlotBooked(slot)) return;
    if (isSlotSelected(slot)) {
      setUserSlots(prev => prev.filter(s => !(s.start === slot.start && s.end === slot.end)));
    } else {
      setUserSlots(prev => [...prev, slot].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
    }
  };

  // Timeline visualization
  const totalMinutes = (DAY_END - DAY_START) * 60;

  const getSlotStyle = (slot: BookingSlot) => {
    const start = timeToMinutes(slot.start) - DAY_START * 60;
    const end = timeToMinutes(slot.end) - DAY_START * 60;
    return {
      left: `${(start / totalMinutes) * 100}%`,
      width: `${((end - start) / totalMinutes) * 100}%`,
    };
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: isLightBg ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="p-2 rounded-lg transition-colors"
            style={{ color: textColor }}
          >
            <CaretLeft size={18} />
          </button>
          <span className="font-semibold text-sm" style={{ color: textColor }}>
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="p-2 rounded-lg transition-colors"
            style={{ color: textColor }}
          >
            <CaretRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: `${textColor}55` }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const dateStr = day.date.toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <button
                key={i}
                type="button"
                disabled={day.isPast || !day.inMonth}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setUserSlots([]);
                  setStartTime('');
                  setEndTime('');
                  setError('');
                  onChange('');
                }}
                className={cn(
                  'relative h-9 rounded-lg text-sm font-medium transition-all',
                  !day.inMonth && 'invisible',
                  day.isPast && 'opacity-30 cursor-not-allowed',
                  !day.isPast && !isSelected && 'hover:opacity-80',
                )}
                style={{
                  backgroundColor: isSelected ? accent : 'transparent',
                  color: isSelected ? '#fff' : textColor,
                  border: isToday && !isSelected ? `2px solid ${accent}` : '2px solid transparent',
                }}
              >
                {day.date.getDate()}
                {day.hasBookings && !isSelected && (
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline + time picker (shown after date selection) */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: textColor }}>
            <CalendarBlank size={16} />
            {formatDateDisplay(new Date(selectedDate + 'T00:00:00'))}
          </div>

          {/* Visual timeline */}
          <div>
            <div className="flex justify-between text-[10px] mb-1" style={{ color: `${textColor}44` }}>
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
            <div
              className="relative h-10 rounded-lg overflow-hidden"
              style={{
                backgroundColor: isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {/* Booked slots */}
              {bookedSlots.map((slot, i) => (
                <div
                  key={`booked-${i}`}
                  className="absolute top-0 h-full rounded opacity-60"
                  style={{
                    ...getSlotStyle(slot),
                    backgroundColor: '#ef4444',
                  }}
                  title={`Booked: ${formatTime(slot.start)} - ${formatTime(slot.end)}`}
                />
              ))}
              {/* User's selected slots */}
              {userSlots.map((slot, i) => (
                <div
                  key={`user-${i}`}
                  className="absolute top-0 h-full rounded"
                  style={{
                    ...getSlotStyle(slot),
                    backgroundColor: accent,
                    opacity: 0.8,
                  }}
                  title={`Your booking: ${formatTime(slot.start)} - ${formatTime(slot.end)}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: `${textColor}55` }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500/60" />
                Booked
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: accent, opacity: 0.8 }} />
                Your selection
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }} />
                Available
              </div>
            </div>
          </div>

          {bookingMode === 'fixed' ? (
            /* ── Fixed duration: clickable slots grouped by time of day ── */
            <div className="space-y-4">
              {fixedSlotGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: `${textColor}55` }}>
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.slots.map((slot) => {
                      const booked = isSlotBooked(slot);
                      const selected = isSlotSelected(slot);
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={booked}
                          onClick={() => toggleFixedSlot(slot)}
                          className={cn(
                            'py-2.5 px-2 rounded-lg text-sm font-medium transition-all text-center',
                            booked && 'opacity-30 cursor-not-allowed line-through',
                            !booked && !selected && 'hover:opacity-80',
                          )}
                          style={{
                            backgroundColor: selected
                              ? accent
                              : booked
                                ? 'rgba(239,68,68,0.1)'
                                : isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                            color: selected ? '#fff' : booked ? '#dc2626' : textColor,
                            border: `1.5px solid ${selected ? accent : isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          {formatTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {userSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: `${textColor}66` }}>Selected:</p>
                  {userSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: `${accent}10`,
                        border: `1.5px solid ${accent}30`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Check size={16} style={{ color: accent }} />
                        <span className="text-sm font-medium" style={{ color: textColor }}>
                          {formatTime(slot.start)} - {formatTime(slot.end)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFixedSlot(slot)}
                        className="text-xs px-2 py-1 rounded-md transition-colors"
                        style={{ color: '#dc2626' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Custom range: start/end dropdowns ── */
            <>
              {/* Existing bookings list */}
              {bookedSlots.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: `${textColor}66` }}>Already booked:</p>
                  <div className="flex flex-wrap gap-2">
                    {bookedSlots.map((slot, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-md"
                        style={{
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          color: '#dc2626',
                        }}
                      >
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time picker */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: isLightBg ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: textColor }}>
                  <Clock size={16} />
                  Add a time slot
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={startTime}
                    onChange={(e) => { setStartTime(e.target.value); setError(''); }}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                      color: textColor,
                    }}
                  >
                    <option value="">Start</option>
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  <span className="text-sm" style={{ color: `${textColor}44` }}>to</span>
                  <select
                    value={endTime}
                    onChange={(e) => { setEndTime(e.target.value); setError(''); }}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                      color: textColor,
                    }}
                  >
                    <option value="">End</option>
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    Add
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <Warning size={16} />
                    {error}
                  </div>
                )}
              </div>

              {/* User's selected slots */}
              {userSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: `${textColor}66` }}>Your bookings:</p>
                  {userSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: `${accent}10`,
                        border: `1.5px solid ${accent}30`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Check size={16} style={{ color: accent }} />
                        <span className="text-sm font-medium" style={{ color: textColor }}>
                          {formatTime(slot.start)} - {formatTime(slot.end)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        className="text-xs px-2 py-1 rounded-md transition-colors"
                        style={{ color: '#dc2626' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {loadingBookings && (
        <p className="text-xs" style={{ color: `${textColor}44` }}>Loading availability...</p>
      )}
    </div>
  );
}
