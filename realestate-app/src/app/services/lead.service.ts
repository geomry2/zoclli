import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ActivityService } from './activity.service';
import { Lead } from '../models/lead.model';
import { toCamelCase, toSnakeCase } from './case.utils';
import { deserializeContactNotes, serializeContactNotes } from '../utils/contact-notes.utils';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly activity = inject(ActivityService);

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
      this.leads.set((data ?? []).map(row => this.hydrateLead(row)));
    }
    this.loading.set(false);
  }

  async add(lead: Omit<Lead, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('leads').insert(this.serializeLead(lead))
      .select().single();
    if (error) return { error: error.message };
    this.leads.update(list => [...list, this.hydrateLead(data)]);
    this.activity.log('created', 'lead', lead.name);
    return { error: null };
  }

  async update(lead: Lead): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { id, ...rest } = lead;
    const { data, error } = await this.supabase
      .from('leads').update(this.serializeLead(rest))
      .eq('id', id).select();
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: 'Update blocked — missing UPDATE policy in Supabase RLS.' };
    this.leads.update(list => list.map(l => l.id === id ? lead : l));
    this.activity.log('updated', 'lead', lead.name);
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const name = this.leads().find(l => l.id === id)?.name ?? id;
    const { error, count } = await this.supabase
      .from('leads').delete({ count: 'exact' }).eq('id', id);
    if (error) return { error: error.message };
    if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };
    this.leads.update(list => list.filter(l => l.id !== id));
    this.activity.log('deleted', 'lead', name);
    return { error: null };
  }

  private hydrateLead(row: Record<string, unknown>): Lead {
    const camelRow = toCamelCase(row) as unknown as Omit<Lead, 'notes'> & { notes?: unknown };
    return {
      ...camelRow,
      notes: deserializeContactNotes(camelRow.notes),
    };
  }

  private serializeLead(lead: Omit<Lead, 'id'>): Record<string, unknown> {
    return toSnakeCase({
      ...lead,
      notes: serializeContactNotes(lead.notes),
    } as unknown as Record<string, unknown>);
  }
}
