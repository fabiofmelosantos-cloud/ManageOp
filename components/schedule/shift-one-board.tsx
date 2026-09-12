"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, WandSparkles, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Worker } from "@/lib/types"

const defaultHours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
const defaultPositions = ["Suporte", "Hone top / Palete", "Hone top / Máquina", "Hone top", "Hone top", "Hone top", "Suporte", "Hone top", "Limpeza", "Saída"]
type ScheduleSnapshot = { id: string; date: string; shift: string; hours: string[]; positions: string[]; columns: string[]; assignments: Record<string, string[]> }

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))
}

export function ShiftOneBoard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [shift, setShift] = useState("turno1")
  const [hours, setHours] = useState(defaultHours)
  const [positions, setPositions] = useState(defaultPositions)
  const [columns, setColumns] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [history, setHistory] = useState<ScheduleSnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetch("/api/data?key=schedule_board_history").then((response) => response.json()).then((payload) => {
      if (active && Array.isArray(payload.data)) setHistory(payload.data)
    }).catch(() => {})
    void import("@/lib/storage").then(async ({ loadWorkers, getWorkers }) => {
      await loadWorkers()
      if (active) {
        const names = getWorkers().map((worker) => worker.name).filter(Boolean)
        setWorkers(getWorkers())
        setColumns(names)
      }
    })
    return () => { active = false }
  }, [])

  const workerNames = useMemo(() => workers.map((worker) => worker.name).filter(Boolean), [workers])
  const lunchHours = ["12:00", "13:00", "14:00"]

  function lunchLabel(columnIndex: number, hour: string) {
    const lunch = lunchHours[columnIndex % lunchHours.length]
    return hour === lunch ? `Almoço (${lunch})` : "Hone top"
  }

  async function buildSchedule(sourceColumns: string[]) {
    const next: Record<string, string[]> = {}
    sourceColumns.forEach((name, columnIndex) => {
      next[name] = hours.map((hour, rowIndex) => lunchHours.includes(hour) ? lunchLabel(columnIndex, hour) : positions[rowIndex] ?? "")
    })
    const snapshot: ScheduleSnapshot = { id: `schedule-board-${Date.now()}`, date, shift, hours: [...hours], positions: [...positions], columns: [...sourceColumns], assignments: next }
    const nextHistory = [...history, snapshot]
    setAssignments(next)
    setHistory(nextHistory)
    setActiveSnapshotId(snapshot.id)
    await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "schedule_board_history", value: nextHistory }) })
  }

  function generateFromWorkers() {
    const names = workerNames.length ? workerNames : columns.filter(Boolean)
    setColumns(names)
    void buildSchedule(names)
  }

  function generateFromManual() {
    const firstFilled = columns.findIndex(Boolean)
    if (firstFilled < 0) return
    const names = columns.map((name, index) => name || `Colaborador ${index + 1}`)
    setColumns(names)
    void buildSchedule(names)
  }

  function loadSnapshot(snapshot: ScheduleSnapshot) {
    setDate(snapshot.date)
    setShift(snapshot.shift)
    setHours(snapshot.hours)
    setPositions(snapshot.positions)
    setColumns(snapshot.columns)
    setAssignments(snapshot.assignments)
    setActiveSnapshotId(snapshot.id)
  }

  function updateCell(column: string, rowIndex: number, value: string) {
    setAssignments((current) => ({ ...current, [column]: (current[column] ?? Array(hours.length).fill("")).map((entry, index) => index === rowIndex ? value : entry) }))
  }

  function addColumn() {
    setColumns((current) => [...current, `Colaborador ${current.length + 1}`])
  }

  function addRow() {
    setHours((current) => [...current, ""])
    setPositions((current) => [...current, ""])
  }

  function removeColumn(index: number) {
    setColumns((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function removeRow(index: number) {
    setHours((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setPositions((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 lg:flex-row lg:items-end lg:justify-between">
        <div><CardTitle>Quadro de horários</CardTitle><CardDescription>Turno 1 · 09:00–18:00 · rotação justa de duas pessoas por hora de almoço.</CardDescription></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1"><Label htmlFor="schedule-date">Dia</Label><Input id="schedule-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9" /></div>
          <div className="grid gap-1"><Label htmlFor="shift-select">Turno</Label><Select value={shift} onValueChange={setShift}><SelectTrigger id="shift-select" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="turno1">Turno 1 · 09–18</SelectItem></SelectContent></Select></div>
          <Button variant="outline" onClick={generateFromWorkers} disabled={!workerNames.length}><UsersRound data-icon="inline-start" />Gerar trabalhadores</Button>
          <Button onClick={generateFromManual}><WandSparkles data-icon="inline-start" />Gerar manual</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={addColumn}><Plus data-icon="inline-start" />Colaborador</Button><Button variant="outline" size="sm" onClick={addRow}><Plus data-icon="inline-start" />Linha</Button><span className="self-center text-xs text-muted-foreground">Escreva os nomes e posições diretamente no quadro.</span></div>
        <div className="overflow-x-auto rounded-md border"><table className="min-w-[1050px] w-full border-collapse text-sm"><caption className="sr-only">Horário de {dateLabel(date)}</caption><thead><tr className="bg-muted/60"><th colSpan={columns.length + 2} className="border px-3 py-2 text-center text-base font-bold">{dateLabel(date)}</th></tr><tr className="bg-muted/40"><th className="border px-2 py-2">Horas</th>{columns.map((column, index) => <th key={`${column}-${index}`} className="min-w-36 border p-2"><Input value={column} onChange={(event) => setColumns((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Nome / posto" className="h-8 text-center font-semibold" /><Button variant="ghost" size="icon" aria-label="Remover colaborador" onClick={() => removeColumn(index)}><Trash2 className="size-4" /></Button></th>)}<th className="border px-2 py-2">Horas*</th></tr></thead><tbody>{hours.map((hour, rowIndex) => <tr key={`${hour}-${rowIndex}`} className={rowIndex % 2 ? "bg-background" : "bg-muted/20"}><th className="border p-2"><Input value={hour} onChange={(event) => setHours((current) => current.map((item, index) => index === rowIndex ? event.target.value : item))} className="h-8 w-20 font-medium" /></th>{columns.map((column, columnIndex) => <td key={`${column}-${rowIndex}`} className="border p-1"><Input value={assignments[column]?.[rowIndex] ?? positions[rowIndex] ?? ""} onChange={(event) => updateCell(column, rowIndex, event.target.value)} className={lunchHours.includes(hour) && assignments[column]?.[rowIndex]?.startsWith("Almoço") ? "h-9 text-center font-bold text-primary" : "h-9 text-center"} /></td>)}<td className="border p-2 text-center"><div className="flex items-center justify-center gap-1"><span>{hour}</span><Button variant="ghost" size="icon" aria-label="Remover linha" onClick={() => removeRow(rowIndex)}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>
        {!columns.length && <p className="p-6 text-center text-sm text-muted-foreground">Adicione trabalhadores ou um colaborador manualmente para começar.</p>}
        {history.length > 0 && <section className="space-y-3 border-t pt-4" aria-labelledby="schedule-history-title">
          <div><h2 id="schedule-history-title" className="text-lg font-semibold">Horários anteriores</h2><p className="text-sm text-muted-foreground">Consulte horários já gerados sem substituir o quadro atual.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{history.slice().reverse().map((snapshot) => <Card key={snapshot.id} className={snapshot.id === activeSnapshotId ? "border-primary" : ""}><CardHeader className="p-4"><CardTitle className="text-base">{dateLabel(snapshot.date)}</CardTitle><CardDescription>{snapshot.shift === "turno1" ? "Turno 1 · 09:00–18:00" : snapshot.shift} · {snapshot.columns.length} colaboradores</CardDescription></CardHeader><CardContent className="p-4 pt-0"><Button variant={snapshot.id === activeSnapshotId ? "secondary" : "outline"} size="sm" onClick={() => loadSnapshot(snapshot)}>Consultar horário</Button></CardContent></Card>)}</div>
        </section>}
      </CardContent>
    </Card>
  )
}
