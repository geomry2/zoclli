import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient | null = this.createSafeClient();

  private createSafeClient(): SupabaseClient | null {
    const { supabaseUrl, supabaseAnonKey } = environment;
    if (!supabaseUrl || !supabaseAnonKey ||
        supabaseUrl.includes('PLACEHOLDER') ||
        supabaseAnonKey.includes('PLACEHOLDER')) {
      console.warn('Supabase credentials not configured.');
      return null;
    }
    try {
      return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
}
