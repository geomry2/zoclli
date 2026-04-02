import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Client } from '../models/client.model';
import { toCamelCase, toSnakeCase } from './case.utils';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly supabase = inject(SupabaseService).client;

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
      this.clients.set((data ?? []).map(row => toCamelCase(row) as unknown as Client));
    }
    this.loading.set(false);
  }

  async add(client: Omit<Client, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('clients').insert(toSnakeCase(client as unknown as Record<string, unknown>))
      .select().single();
    if (error) return { error: error.message };
    this.clients.update(list => [...list, toCamelCase(data) as unknown as Client]);
    return { error: null };
  }

  async update(client: Client): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { id, ...rest } = client;
    const { error } = await this.supabase
      .from('clients').update(toSnakeCase(rest as unknown as Record<string, unknown>))
      .eq('id', id);
    if (error) return { error: error.message };
    this.clients.update(list => list.map(c => c.id === id ? client : c));
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { error } = await this.supabase.from('clients').delete().eq('id', id);
    if (error) return { error: error.message };
    this.clients.update(list => list.filter(c => c.id !== id));
    return { error: null };
  }
}
