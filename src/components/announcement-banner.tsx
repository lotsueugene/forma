'use client';

import { useEffect, useState } from 'react';
import { X, Info, Warning, CheckCircle, Star } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  dismissible: boolean;
  showBanner: boolean;
  showModal: boolean;
}

const typeConfig = {
  info: { icon: Info, bg: 'bg-safety-orange/10 border-safety-orange/20', text: 'text-safety-orange' },
  warning: { icon: Warning, bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500' },
  success: { icon: CheckCircle, bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500' },
  update: { icon: Star, bg: 'bg-safety-orange/10 border-safety-orange/20', text: 'text-safety-orange' },
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        const bannerAnnouncements = (data.announcements || []).filter(
          (a: Announcement) => a.showBanner
        );
        setAnnouncements(bannerAnnouncements);
      })
      .catch(console.error);
  }, []);

  const dismiss = async (id: string) => {
    setDismissed(prev => new Set(prev).add(id));

    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: id }),
      });
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {visibleAnnouncements.map((announcement) => {
        const config = typeConfig[announcement.type as keyof typeof typeConfig] || typeConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={announcement.id}
            className={cn('px-4 py-3 rounded-lg border flex items-start gap-3', config.bg)}
          >
            <Icon size={20} className={cn('flex-shrink-0 mt-0.5', config.text)} />
            <div className="flex-1 min-w-0">
              <div className={cn('font-medium', config.text)}>{announcement.title}</div>
              <div className="text-sm text-neutral-700 mt-0.5">{announcement.content}</div>
            </div>
            {announcement.dismissible && (
              <button
                onClick={() => dismiss(announcement.id)}
                className="text-neutral-400 hover:text-neutral-200 flex-shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
