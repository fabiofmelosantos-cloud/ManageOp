"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Search, Download } from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user_name: string
  user_role: string
  action: string
  table_name: string
  record_id: string
  old_values: any
  new_values: any
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterTable, setFilterTable] = useState<string>("all")
  const { userProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Apenas ADMIN pode ver logs
    if (userProfile?.role !== "ADMIN") {
      router.push("/")
      return
    }

    loadLogs()
  }, [userProfile, router])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, filterAction, filterTable])

  async function loadLogs() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("[v0] Erro ao carregar logs:", error)
    } finally {
      setLoading(false)
    }
  }

  function filterLogs() {
    let filtered = logs

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action === filterAction)
    }

    if (filterTable !== "all") {
      filtered = filtered.filter((log) => log.table_name === filterTable)
    }

    setFilteredLogs(filtered)
  }

  function exportLogs() {
    const csv = [
      ["Data/Hora", "Usuário", "Role", "Ação", "Tabela", "ID Registro"],
      ...filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString("pt-PT"),
        log.user_name,
        log.user_role,
        log.action,
        log.table_name,
        log.record_id || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString()}.csv`
    a.click()
  }

  if (loading) {
    return <div className="p-6">A carregar logs...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Logs de Auditoria</h1>
        <p className="text-sm text-muted-foreground">Histórico completo de ações realizadas no sistema</p>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuário, tabela ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="CREATE">Criar</SelectItem>
              <SelectItem value="UPDATE">Atualizar</SelectItem>
              <SelectItem value="DELETE">Deletar</SelectItem>
              <SelectItem value="VIEW">Visualizar</SelectItem>
              <SelectItem value="EXPORT">Exportar</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="workers">Workers</SelectItem>
              <SelectItem value="schedules">Schedules</SelectItem>
              <SelectItem value="production_lines">Linhas</SelectItem>
              <SelectItem value="shift_assignments">Turnos</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Data/Hora</th>
                <th className="p-3 text-left font-medium">Usuário</th>
                <th className="p-3 text-left font-medium">Role</th>
                <th className="p-3 text-left font-medium">Ação</th>
                <th className="p-3 text-left font-medium">Tabela</th>
                <th className="p-3 text-left font-medium">ID Registro</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">{new Date(log.timestamp).toLocaleString("pt-PT")}</td>
                  <td className="p-3 font-medium">{log.user_name}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.user_role === "ADMIN"
                          ? "bg-red-100 text-red-700"
                          : log.user_role === "COORDENADOR"
                            ? "bg-blue-100 text-blue-700"
                            : log.user_role === "RH"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.user_role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.action === "CREATE"
                          ? "bg-green-100 text-green-700"
                          : log.action === "UPDATE"
                            ? "bg-yellow-100 text-yellow-700"
                            : log.action === "DELETE"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{log.table_name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{log.record_id?.substring(0, 8)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Nenhum log encontrado</div>
        )}
      </Card>
    </div>
  )
}
