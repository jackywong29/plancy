import type { Settings } from '@/data/types';

/**
 * Whether plancy is private: the whole-app lock is on. Then nothing outside
 * plancy shows a task's name — not a reminder, a nudge or the widget —
 * because those are read on the Lock Screen and in Notification Center
 * without Face ID. The Journal & Finance lock leaves tasks open, so it
 * isn't private.
 */
export function isPrivate(settings: Pick<Settings, 'lockEnabled' | 'lockScope'>): boolean {
  return settings.lockEnabled && settings.lockScope === 'app';
}
