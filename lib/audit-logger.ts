// Utilitário para registrar ações do usuário
// Complementa os triggers automáticos do banco de dados

import { createClient } from "./supabase/client"

interface AuditLogEntry {
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "EXPORT" | "LOGIN" | "LOGOUT"
  tableName: string
  recordId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const supabase = createClient()

    // Obter informações do usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Obter profile do usuário
    const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", user.id).single()

    // Registrar no banco
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: profile?.name || "Desconhecido",
      user_role: profile?.role || "OPERADOR",
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId,
      old_values: entry.oldValues,
      new_values: entry.newValues,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
    })

    console.log("[v0] Audit log registrado:", entry.action, entry.tableName)
  } catch (error) {
    console.error("[v0] Erro ao registrar audit log:", error)
  }
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    return data.ip
  } catch {
    return "unknown"
  }
}

// Helpers para ações comuns
export const auditHelpers = {
  logCreate: (tableName: string, recordId: string, data: Record<string, any>) =>
    logAudit({ action: "CREATE", tableName, recordId, newValues: data }),

  logUpdate: (tableName: string, recordId: string, oldData: Record<string, any>, newData: Record<string, any>) =>
    logAudit({ action: "UPDATE", tableName, recordId, oldValues: oldData, newValues: newData }),

  logDelete: (tableName: string, recordId: string, data: Record<string, any>) =>
    logAudit({ action: "DELETE", tableName, recordId, oldValues: data }),

  logView: (tableName: string, recordId?: string) => logAudit({ action: "VIEW", tableName, recordId }),

  logExport: (tableName: string, metadata?: Record<string, any>) => logAudit({ action: "EXPORT", tableName, metadata }),

  logLogin: () => logAudit({ action: "LOGIN", tableName: "auth" }),

  logLogout: () => logAudit({ action: "LOGOUT", tableName: "auth" }),
}
