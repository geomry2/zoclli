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
    if (!this.supabase) { this.error.set('Supabase not configured.'); return; }
    this.loading.set(true);
    const { data, error } = await this.supabase.from('leads').select('*').order('name');
    if (error) { this.error.set(error.message); } else {
      this.leads.set((data ?? []).map(row => toCamelCase(row) as unknown as Lead));
    }
    this.loading.set(false);
  }

  async add(lead: Omit<Lead, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('leads').insert(toSnakeCase(lead as unknown as Record<string, unknown>))
      .select().single();
    if (error) return { error: error.message };
    this.leads.update(list => [...list, toCamelCase(data) as unknown as Lead]);
    return { error: null };
  }

  async update(lead: Lead): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { id, ...rest } = lead;
    const { data, error } = await this.supabase
      .from('leads').update(toSnakeCase(rest as unknown as Record<string, unknown>))
      .eq('id', id).select();
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: 'Update blocked — missing UPDATE policy in Supabase RLS.' };
    this.leads.update(list => list.map(l => l.id === id ? lead : l));
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { error, count } = await this.supabase
      .from('leads').delete({ count: 'exact' }).eq('id', id);
    if (error) return { error: error.message };
    if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };
    this.leads.update(list => list.filter(l => l.id !== id));
    return { error: null };
  }
}
