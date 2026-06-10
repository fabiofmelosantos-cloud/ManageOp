import { neon } from "@neondatabase/serverless"

// Cliente Neon singleton
let sql: ReturnType<typeof neon> | null = null

function getNeonClient() {
  if (sql) return sql

  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("[Neon] Missing DATABASE_URL environment variable")
    return null
  }

  try {
    sql = neon(databaseUrl)
    return sql
  } catch (error) {
    console.error("[Neon] Failed to initialize client:", error)
    return null
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  const client = getNeonClient()
  if (!client) {
    console.error("[Neon] Client not initialized")
    return null
  }

  try {
    const result = await client`
      SELECT value FROM app_storage WHERE key = ${key}
    `

    if (result.length === 0) return null
    return result[0].value as T
  } catch (error) {
    console.error(`[Neon] Error getting ${key}:`, error)
    return null
  }
}

export async function setData<T>(key: string, value: T): Promise<boolean> {
  const client = getNeonClient()
  if (!client) {
    console.error("[Neon] Client not initialized")
    return false
  }

  try {
    await client`
      INSERT INTO app_storage (key, value)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()
    `
    return true
  } catch (error) {
    console.error(`[Neon] Error setting ${key}:`, error)
    return false
  }
}

export async function deleteData(key: string): Promise<boolean> {
  const client = getNeonClient()
  if (!client) {
    console.error("[Neon] Client not initialized")
    return false
  }

  try {
    await client`DELETE FROM app_storage WHERE key = ${key}`
    return true
  } catch (error) {
    console.error(`[Neon] Error deleting ${key}:`, error)
    return false
  }
}

export async function getAllKeys(): Promise<string[]> {
  const client = getNeonClient()
  if (!client) {
    console.error("[Neon] Client not initialized")
    return []
  }

  try {
    const result = await client`SELECT key FROM app_storage`
    return result.map((row) => row.key)
  } catch (error) {
    console.error("[Neon] Error getting all keys:", error)
    return []
  }
}
