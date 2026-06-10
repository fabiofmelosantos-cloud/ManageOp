"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Search } from "lucide-react"

interface CompensatoryDay {
  id: string
  worker_id: string
  date: string
  reason: string
  status: string
  worker: {
    name: string
    employee_id: string
  }
}

export function CompensatoryDaysList() {
  const [days, setDays] = useState<CompensatoryDay[]>([])
  const [filteredDays, setFilteredDays] = useState<CompensatoryDay[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDays()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredDays(
        days.filter(
          (d) =>
            d.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.worker.employee_id.includes(searchTerm),
        ),
      )
    } else {
      setFilteredDays(days)
    }
  }, [searchTerm, days])

  const loadDays = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from("compensatory_days")
      .select(`
        *,
        worker:workers(name, employee_id)
      `)
      .order("date", { ascending: false })

    if (!error && data) {
      setDays(data as any)
      setFilteredDays(data as any)
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Descansos Compensatórios</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Lista de todos os DC registados no sistema</CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : filteredDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum DC encontrado</p>
          ) : (
            filteredDays.map((day) => (
              <div
                key={day.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{day.worker.name}</p>
                  <p className="text-xs text-muted-foreground">Nº {day.worker.employee_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(day.date), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                  {day.reason && <p className="text-xs text-muted-foreground mt-1">{day.reason}</p>}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    day.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-600"
                      : day.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-red-500/20 text-red-600"
                  }
                >
                  {day.status === "approved" ? "Aprovado" : day.status === "pending" ? "Pendente" : "Rejeitado"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
