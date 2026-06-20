export function isTossApp(): boolean {
  return typeof window !== 'undefined' &&
    (window.location.hostname.includes('toss.im') ||
     navigator.userAgent.includes('TossApp'));
}

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || '';
}

export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
}
