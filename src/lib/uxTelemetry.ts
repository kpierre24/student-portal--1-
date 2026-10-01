export type UxEventName =
  | 'navigation_changed'
  | 'sync_retry_requested'
  | 'offline_detected'
  | 'online_restored'
  | 'feedback_action_clicked';

export type UxEvent = {
  name: UxEventName;
  timestamp: string;
  context?: Record<string, string | number | boolean | null>;
};

const STORAGE_KEY = 'hteim_ux_events';
const MAX_EVENTS = 100;

export function trackUxEvent(name: UxEventName, context?: UxEvent['context']): void {
  if (typeof window === 'undefined') return;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const events: UxEvent[] = saved ? JSON.parse(saved) : [];
    const nextEvents = Array.isArray(events) ? events.slice(-(MAX_EVENTS - 1)) : [];
    nextEvents.push({ name, timestamp: new Date().toISOString(), context });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  } catch {
    // Telemetry must never interrupt the user workflow.
  }
}

export function clearUxTelemetry(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
