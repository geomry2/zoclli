import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private readonly supabase = inject(SupabaseService).client;
  readonly buildings = signal<string[]>([]);

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) return;
    const { data } = await this.supabase.from('buildings').select('name').order('name');
    this.buildings.set((data ?? []).map((r: { name: string }) => r.name));
  }

  async ensureExists(name: string): Promise<void> {
    if (!name?.trim() || !this.supabase) return;
    if (this.buildings().includes(name)) return;
    await this.supabase.from('buildings').upsert({ name }, { onConflict: 'name' });
    this.buildings.update(list => [...list, name].sort());
  }
}
