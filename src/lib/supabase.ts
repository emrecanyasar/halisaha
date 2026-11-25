import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * Supabase bağlantısı. Ortam değişkenleri yoksa (ör. tek dosyalık önizleme) null olur
 * ve site eskisi gibi tarayıcıdaki verilerle çalışır.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const REMOTE = !!supabase
