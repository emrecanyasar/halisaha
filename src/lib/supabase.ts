import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite dışında (ör. testlerde) import.meta.env tanımsız olabilir
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Supabase bağlantısı. Ortam değişkenleri yoksa (ör. tek dosyalık önizleme) null olur
 * ve site eskisi gibi tarayıcıdaki verilerle çalışır.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const REMOTE = !!supabase
