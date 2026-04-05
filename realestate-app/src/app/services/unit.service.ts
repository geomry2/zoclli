import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Unit } from '../models/unit.model';
import { toCamelCase, toSnakeCase } from './case.utils';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private readonly supabase = inject(SupabaseService).client;

  readonly units = signal<Unit[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) {
      this.error.set('Supabase not configured.');
      return;
    }
    this.loading.set(true);
    const { data, error } = await this.supabase.from('units').select('*').order('building_name').order('apartment_number');
    if (error) {
      this.error.set(error.message);
    } else {
      this.units.set((data ?? []).map(row => toCamelCase(row) as unknown as Unit));
    }
    this.loading.set(false);
  }

  async add(unit: Omit<Unit, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('units')
      .insert(toSnakeCase(unit as unknown as Record<string, unknown>))
      .select()
      .single();
    if (error) return { error: error.message };
    this.units.update(list => [...list, toCamelCase(data) as unknown as Unit]);
    return { error: null };
  }

  async update(unit: Unit): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { id, ...rest } = unit;
    const { data, error } = await this.supabase
      .from('units')
      .update(toSnakeCase(rest as unknown as Record<string, unknown>))
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error.message };
    if (!data) return { error: 'Update blocked — missing UPDATE policy in Supabase RLS.' };
    const updated = toCamelCase(data) as unknown as Unit;
    this.units.update(list => list.map(entry => entry.id === id ? updated : entry));
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { error, count } = await this.supabase
      .from('units')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) return { error: error.message };
    if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };
    this.units.update(list => list.filter(unit => unit.id !== id));
    return { error: null };
  }
}
