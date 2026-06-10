"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createBrowserClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Search, AlertTriangle } from "lucide-react"

interface Absence {
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

interface RepeatedOffender {
  worker_id: string
  worker_name: string
  employee_id: string
  absence_count: number
}

export function AbsencesList() {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([])
  const [repeatedOffenders, setRepeatedOffenders] = useState<RepeatedOffender[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAbsences()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredAbsences(
        absences.filter(
          (a) =>
            a.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.worker.employee_id.includes(searchTerm),
        ),
      )
    } else {
      setFilteredAbsences(absences)
    }
  }, [searchTerm, absences])

  const loadAbsences = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from("absences")
      .select(`
        *,
        worker:workers(name, employee_id)
      `)
      .order("date", { ascending: false })

    if (!error && data) {
      setAbsences(data as any)
      setFilteredAbsences(data as any)

      // Calcular reincidentes (3 ou mais faltas)
      const absencesByWorker = (data as any).reduce((acc: any, absence: any) => {
        if (!acc[absence.worker_id]) {
          acc[absence.worker_id] = {
            worker_id: absence.worker_id,
            worker_name: absence.worker.name,
            employee_id: absence.worker.employee_id,
            absence_count: 0,
          }
        }
        acc[absence.worker_id].absence_count++
        return acc
      }, {})

      const offenders = Object.values(absencesByWorker).filter((w: any) => w.absence_count >= 3)
      setRepeatedOffenders(offenders as RepeatedOffender[])
    }

    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {repeatedOffenders.length > 0 && (
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600">Reincidentes em Faltas</AlertTitle>
          <AlertDescription className="text-sm text-orange-600/90">
            {repeatedOffenders.map((offender, idx) => (
              <div key={offender.worker_id}>
                <strong>{offender.worker_name}</strong> (Nº {offender.employee_id}) - {offender.absence_count} faltas
                {idx < repeatedOffenders.length - 1 && <br />}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Faltas Registadas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Lista de todas as faltas no sistema</CardDescription>
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
            ) : filteredAbsences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma falta encontrada</p>
            ) : (
              filteredAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{absence.worker.name}</p>
                    <p className="text-xs text-muted-foreground">Nº {absence.worker.employee_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {absence.date
                        ? format(new Date(absence.date), "dd 'de' MMMM 'de' yyyy", { locale: pt })
                        : "Data não especificada"}
                    </p>
                    {absence.reason && <p className="text-xs text-muted-foreground mt-1">{absence.reason}</p>}
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      absence.status === "justified"
                        ? "bg-blue-500/20 text-blue-600"
                        : absence.status === "unjustified"
                          ? "bg-red-500/20 text-red-600"
                          : "bg-gray-500/20 text-gray-600"
                    }
                  >
                    {absence.status === "justified"
                      ? "Justificada"
                      : absence.status === "unjustified"
                        ? "Injustificada"
                        : "Registada"}
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
