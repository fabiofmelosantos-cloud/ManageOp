"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Clock3, WandSparkles } from "lucide-react"
import type { Worker } from "@/lib/types"

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
const tasks = ["Suporte", "Hone top", "Hone top", "Hone top", "Hone top", "Hone top", "Suporte", "Hone top", "Limpeza", "Saída"]

function todayLabel() {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "long" }).format(new Date())
}

export function ShiftOneBoard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [shift, setShift] = useState("turno1")
  const [generated, setGenerated] = useState<Record<string, string[]>>({})
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    let active = true
    void import("@/lib/storage").then(async ({ loadWorkers, getWorkers }) => {
      await loadWorkers()
      if (active) setWorkers(getWorkers())
    })
    return () => { active = false }
  }, [])

  const names = useMemo(() => workers.map((worker) => worker.name).filter(Boolean), [workers])

  function generate() {
    const assignments: Record<string, string[]> = {}
    names.forEach((name, index) => {
      assignments[name] = hours.map((hour, hourIndex) => {
        if (hour === "12:00" || hour === "13:00" || hour === "14:00") {
          const lunchHour = 12 + (index % 3)
          return Number(hour.slice(0, 2)) === lunchHour ? `Almoço (${lunchHour}:00)` : "Hone top"
        }
        return tasks[hourIndex]
      })
    })
    setGenerated(assignments)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" />Quadro de horários</CardTitle>
          <CardDescription>Turno 1 · 09:00–18:00 · almoço distribuído de forma rotativa.</CardDescription>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1"><label htmlFor="schedule-date" className="text-xs font-medium">Dia</label><input id="schedule-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" /></div>
          <div className="grid gap-1"><label htmlFor="shift-select" className="text-xs font-medium">Turno</label><Select value={shift} onValueChange={setShift}><SelectTrigger id="shift-select" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="turno1">Turno 1 · 09–18</SelectItem></SelectContent></Select></div>
          <Button onClick={generate} disabled={!names.length}><WandSparkles data-icon="inline-start" />Gerar horário</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <caption className="sr-only">Horário de {todayLabel()}</caption>
            <thead><tr className="bg-muted/60"><th colSpan={names.length + 2} className="border px-3 py-2 text-center text-base font-bold">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))}</th></tr><tr className="bg-muted/40"><th className="border px-3 py-2 text-left">Horas</th>{names.map((name) => <th key={name} className="border px-3 py-2 text-center font-semibold">{name}</th>)}<th className="border px-3 py-2">Horas*</th></tr></thead>
            <tbody>{hours.map((hour, hourIndex) => <tr key={hour} className={hourIndex % 2 ? "bg-background" : "bg-muted/20"}><th className="border px-3 py-2 text-left font-medium">{hour}</th>{names.map((name) => <td key={`${name}-${hour}`} className={`border px-3 py-2 text-center ${generated[name]?.[hourIndex]?.startsWith("Almoço") ? "font-bold text-primary" : ""}`}>{generated[name]?.[hourIndex] ?? "—"}</td>)}<td className="border px-3 py-2 text-center font-medium">{hour}</td></tr>)}</tbody>
          </table>
        </div>
        {!names.length && <p className="p-6 text-center text-sm text-muted-foreground">Adicione trabalhadores para gerar o horário.</p>}
      </CardContent>
    </Card>
  )
}
