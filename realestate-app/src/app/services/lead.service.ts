import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Lead } from '../models/lead.model';
import { toCamelCase, toSnakeCase } from './case.utils';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly supabase = inject(SupabaseService).client;

  readonly leads = signal<Lead[]>([]);
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
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .order('name');
    if (error) {
      this.error.set(error.message);
    } else {
      this.leads.set((data ?? []).map(row => toCamelCase(row) as unknown as Lead));
    }
    this.loading.set(false);
  }

  async add(lead: Omit<Lead, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('leads')
      .insert(toSnakeCase(lead as unknown as Record<string, unknown>))
      .select()
      .single();
    if (error) return { error: error.message };
    this.leads.update(list => [...list, toCamelCase(data) as unknown as Lead]);
    return { error: null };
  }
}
