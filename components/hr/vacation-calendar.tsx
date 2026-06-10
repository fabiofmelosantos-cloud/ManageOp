"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { createBrowserClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { pt } from "date-fns/locale"

interface VacationRequest {
  id: string
  worker_id: string
  start_date: string
  end_date: string
  total_days: number
  status: string
  worker: {
    name: string
    employee_id: string
  }
}

export function VacationCalendar() {
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVacations()
  }, [])

  const loadVacations = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from("vacation_requests")
      .select(`
        *,
        worker:workers(name, employee_id)
      `)
      .eq("status", "approved")
      .order("start_date", { ascending: true })

    if (!error && data) {
      setVacations(data as any)
    }

    setLoading(false)
  }

  const vacationsForSelectedDate = vacations.filter((v) => {
    if (!selectedDate) return false
    const selected = format(selectedDate, "yyyy-MM-dd")
    return selected >= v.start_date && selected <= v.end_date
  })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Calendário de Férias</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Selecione uma data para ver quem está de férias
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={pt}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt }) : "Selecione uma data"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {vacationsForSelectedDate.length} trabalhador(es) de férias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vacationsForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum trabalhador de férias neste dia</p>
            ) : (
              vacationsForSelectedDate.map((vacation) => (
                <div
                  key={vacation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{vacation.worker.name}</p>
                    <p className="text-xs text-muted-foreground">Nº {vacation.worker.employee_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(vacation.start_date), "dd/MM", { locale: pt })} -{" "}
                      {format(new Date(vacation.end_date), "dd/MM", { locale: pt })} ({vacation.total_days} dias)
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
                    Férias
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
