import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private readonly supabase = inject(SupabaseService).client;
  readonly buildings = signal<string[]>([]);
  readonly buildingImages = signal<Record<string, string>>({});

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) return;
    const { data } = await this.supabase.from('buildings').select('*').order('name');
    const rows = (data ?? []) as Array<{ name: string; image_url?: string | null }>;
    this.buildings.set(rows.map(row => row.name));
    this.buildingImages.set(rows.reduce((acc, row) => {
      if (row.image_url) acc[row.name] = row.image_url;
      return acc;
    }, {} as Record<string, string>));
  }

  async ensureExists(name: string): Promise<void> {
    if (!name?.trim() || !this.supabase) return;
    if (this.buildings().includes(name)) return;
    await this.supabase.from('buildings').upsert({ name }, { onConflict: 'name' });
    this.buildings.update(list => [...list, name].sort());
  }

  imageFor(name: string): string | null {
    return this.buildingImages()[name] ?? null;
  }

  async remove(name: string): Promise<{ error: string | null }> {
    if (!name?.trim() || !this.supabase) return { error: null };
    const { error, count } = await this.supabase
      .from('buildings')
      .delete({ count: 'exact' })
      .eq('name', name);
    if (error) return { error: error.message };
    if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };
    this.buildings.update(list => list.filter(item => item !== name));
    this.buildingImages.update(images => {
      const next = { ...images };
      delete next[name];
      return next;
    });
    return { error: null };
  }
}
