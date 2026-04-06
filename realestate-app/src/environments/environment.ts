type EnvConfig = {
  production: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appPassword: string;
  taskParserUrl: string;
};

declare global {
  interface Window {
    __env?: Partial<EnvConfig>;
  }
}

export const environment: EnvConfig = {
  production: false,
  supabaseUrl: 'SUPABASE_URL_PLACEHOLDER',
  supabaseAnonKey: 'SUPABASE_ANON_KEY_PLACEHOLDER',
  appPassword: 'APP_PASSWORD_PLACEHOLDER',
  taskParserUrl: 'TASK_PARSER_URL_PLACEHOLDER',
  ...(window.__env ?? {}),
};
