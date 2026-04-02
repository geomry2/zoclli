import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Client } from '../models/client.model';

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
    if (!this.supabase) {
      this.error.set('Supabase not configured.');
      return;
    }
    this.loading.set(true);
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .order('name');
    if (error) {
      this.error.set(error.message);
    } else {
      this.clients.set((data ?? []) as Client[]);
    }
    this.loading.set(false);
  }

  async add(client: Omit<Client, 'id'>): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await this.supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    if (error) return { error: error.message };
    this.clients.update(list => [...list, data as Client]);
    return { error: null };
  }
}
