import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ActivityService } from './activity.service';
import { Client } from '../models/client.model';
import { toCamelCase, toSnakeCase } from './case.utils';
import { deserializeContactNotes, serializeContactNotes } from '../utils/contact-notes.utils';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly activity = inject(ActivityService);

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    if (!this.supabase) { this.error.set('Supabase not configured.'); return; }
    this.loading.set(true);
    const { data, error } = await this.supabase.from('clients').select('*').order('name');
    if (error) { this.error.set(error.message); } else {
      this.clients.set((data ?? []).map(row => this.hydrateClient(row)));
    }
    this.loading.set(false);
  }

  async add(client: Omit<Client, 'id'>, action: 'created' | 'converted' = 'created'): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('clients').insert(this.serializeClient(client))
      .select().single();
    if (error) return { error: error.message };
    this.clients.update(list => [...list, this.hydrateClient(data)]);
    this.activity.log(action, 'client', client.name);
    return { error: null };
  }

  async update(client: Client): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { id, ...rest } = client;
    const { data, error } = await this.supabase
      .from('clients').update(this.serializeClient(rest))
      .eq('id', id).select();
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: 'Update blocked — missing UPDATE policy in Supabase RLS.' };
    this.clients.update(list => list.map(c => c.id === id ? client : c));
    this.activity.log('updated', 'client', client.name);
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const name = this.clients().find(c => c.id === id)?.name ?? id;
    const { error, count } = await this.supabase
      .from('clients').delete({ count: 'exact' }).eq('id', id);
    if (error) return { error: error.message };
    if (count === 0) return { error: 'Delete blocked — missing DELETE policy in Supabase RLS.' };
    this.clients.update(list => list.filter(c => c.id !== id));
    this.activity.log('deleted', 'client', name);
    return { error: null };
  }

  private hydrateClient(row: Record<string, unknown>): Client {
    const camelRow = toCamelCase(row) as unknown as Omit<Client, 'notes'> & { notes?: unknown };
    return {
      ...camelRow,
      notes: deserializeContactNotes(camelRow.notes),
    };
  }

  private serializeClient(client: Omit<Client, 'id'>): Record<string, unknown> {
    return toSnakeCase({
      ...client,
      notes: serializeContactNotes(client.notes),
    } as unknown as Record<string, unknown>);
  }
}
