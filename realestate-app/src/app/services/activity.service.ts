import { Injectable, signal } from '@angular/core';

export interface ActivityEntry {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'converted';
  entityType: 'client' | 'lead' | 'task';
  name: string;
  timestamp: string;
}

const STORAGE_KEY = 'zoclli_activity';
const MAX_ENTRIES = 50;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  readonly activities = signal<ActivityEntry[]>(this.load());

  log(action: ActivityEntry['action'], entityType: ActivityEntry['entityType'], name: string) {
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      action,
      entityType,
      name,
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...this.activities()].slice(0, MAX_ENTRIES);
    this.activities.set(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }

  private load(): ActivityEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}
