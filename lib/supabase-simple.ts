import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing environment variables')
    return null
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    supabaseInstance = createClient(supabaseUrl, supabaseKey)
    return supabaseInstance
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error)
    return null
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    console.error('[Supabase] Client not initialized')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('app_storage')
      .select('value')
      .eq('key', key)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    
    return data?.value as T
  } catch (error) {
    console.error(`[Supabase] Error getting ${key}:`, error)
    return null
  }
}

export async function setData<T>(key: string, value: T): Promise<boolean> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    console.error('[Supabase] Client not initialized')
    return false
  }

  try {
    const { error } = await supabase
      .from('app_storage')
      .upsert({ key, value }, { onConflict: 'key' })
    
    if (error) throw error
    return true
  } catch (error) {
    console.error(`[Supabase] Error setting ${key}:`, error)
    return false
  }
}
