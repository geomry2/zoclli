import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type AppUserLogin = 'george' | 'agis' | 'tanya' | 'julia';

export interface AppUser {
  login: AppUserLogin;
  email: string;
  nameEn: string;
  nameRu: string;
  taskName: string;
}

const USERS: AppUser[] = [
  { login: 'george', email: 'george@zoclli.local', nameEn: 'George', nameRu: 'Георгий', taskName: 'George' },
  { login: 'agis', email: 'agis@zoclli.local', nameEn: 'Agis', nameRu: 'Агис', taskName: 'Agis' },
  { login: 'tanya', email: 'tanya@zoclli.local', nameEn: 'Tanya', nameRu: 'Таня', taskName: 'Tanya' },
  { login: 'julia', email: 'julia@zoclli.local', nameEn: 'Julia', nameRu: 'Юля', taskName: 'Julia' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  readonly loading = signal(Boolean(this.supabase));
  readonly user = signal<AppUser | null>(null);
  readonly authenticated = computed(() => Boolean(this.user()));
  readonly users = USERS;

  constructor() {
    if (!this.supabase) {
      this.loading.set(false);
      return;
    }

    void this.loadSession();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.user.set(this.userFromEmail(session?.user.email ?? ''));
      this.loading.set(false);
    });
  }

  async signIn(login: string, password: string): Promise<{ error: string | null }> {
    if (!this.supabase) return { error: 'Supabase not configured.' };

    const user = USERS.find(entry => entry.login === login.trim().toLowerCase());
    if (!user) return { error: 'Unknown user.' };

    this.loading.set(true);
    const { error } = await this.supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    this.loading.set(false);

    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this.user.set(null);
  }

  nameForLanguage(lang: 'en' | 'ru'): string {
    const current = this.user();
    if (!current) return '';
    return lang === 'ru' ? current.nameRu : current.nameEn;
  }

  currentTaskName(): string {
    return this.user()?.taskName ?? '';
  }

  private async loadSession() {
    const { data } = await this.supabase!.auth.getSession();
    this.user.set(this.userFromEmail(data.session?.user.email ?? ''));
    this.loading.set(false);
  }

  private userFromEmail(email: string): AppUser | null {
    const normalized = email.trim().toLowerCase();
    return USERS.find(user => user.email === normalized) ?? null;
  }
}
