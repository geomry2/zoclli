import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private readonly supabase = inject(SupabaseService).client;
  readonly agencies = signal<string[]>([]);

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) return;
    const { data } = await this.supabase.from('agencies').select('name').order('name');
    this.agencies.set((data ?? []).map((r: { name: string }) => r.name));
  }

  async ensureExists(name: string): Promise<void> {
    if (!name?.trim() || !this.supabase) return;
    if (this.agencies().includes(name)) return;
    await this.supabase.from('agencies').upsert({ name }, { onConflict: 'name' });
    this.agencies.update(list => [...list, name].sort());
  }
}
