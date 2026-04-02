import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Lead } from '../models/lead.model';

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
      this.leads.set((data ?? []) as Lead[]);
    }
    this.loading.set(false);
  }

  async add(lead: Omit<Lead, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();
    if (error) return { error: error.message };
    this.leads.update(list => [...list, data as Lead]);
    return { error: null };
  }
}
