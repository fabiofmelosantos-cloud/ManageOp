"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, WandSparkles, UsersRound, Lock, LockOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ProductionLine, Worker } from "@/lib/types"

const defaultHours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
const defaultPositions = ["Honetop / Selar", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Limpeza", "Saída"]
const LOCKED_HOURS = new Set(["17:00", "18:00"])
type ScheduleSnapshot = {
  id: string
  date: string
  shift: string
  hours: string[]
  positions: string[]
  columns: string[]
  assignments: Record<string, string[]>
  lunchOffset?: number
  lineRotationOffset?: number
  lockedColumns?: string[]
  lockedCells?: string[]
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))
}

function roomOf(value: string) {
  return (value ?? "").split("/")[0].trim()
}

export function ShiftOneBoard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [shift, setShift] = useState("turno1")
  const [hours, setHours] = useState(defaultHours)
  const [positions, setPositions] = useState(defaultPositions)
  const [columns, setColumns] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [history, setHistory] = useState<ScheduleSnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [lockedColumns, setLockedColumns] = useState<Set<string>>(new Set())
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    void fetch("/api/data?key=schedule_board_history").then((response) => response.json()).then((payload) => {
      if (active && Array.isArray(payload.data)) setHistory(payload.data)
    }).catch(() => {})
    void import("@/lib/storage").then(async ({ loadWorkers, getWorkers, loadProductionLines }) => {
      await loadWorkers()
      const lines = await loadProductionLines()
      if (active) {
        const names = getWorkers().map((worker) => worker.name).filter(Boolean)
        setWorkers(getWorkers())
        setColumns(names)
        setProductionLines(lines)
      }
    })
    return () => { active = false }
  }, [])

  const workerNames = useMemo(() => workers.map((worker) => worker.name).filter(Boolean), [workers])
  const activeLines = useMemo(() => productionLines.filter((line) => line.isActive), [productionLines])
  const lineNames = useMemo(() => activeLines.map((line) => line.name), [activeLines])
  const lunchHours = ["12:00", "13:00", "14:00"]

  function selectValueForColumn(column: string) {
    const room = roomOf(assignments[column]?.[0] ?? positions[0] ?? "")
    if (room === "Suporte" || lineNames.includes(room)) return room
    return ""
  }

  async function buildSchedule(sourceColumns: string[]) {
    const lastSnapshot = history.length ? history[history.length - 1] : undefined
    const lunchOffsetUsed = ((lastSnapshot?.lunchOffset ?? -1) + 1) % lunchHours.length

    const lineNeeds = activeLines.map((line) => ({
      name: line.name,
      needed: line.requirements.length ? Math.max(...line.requirements.map((requirement) => requirement.workersNeeded || 0)) : 0,
    }))

    const lockedAssignment: Record<string, string> = {}
    sourceColumns.forEach((name) => {
      if (lockedColumns.has(name)) {
        const room = roomOf(assignments[name]?.[0] || positions[0] || "")
        lockedAssignment[name] = room || "Suporte"
      }
    })

    const remainingNeed = new Map(lineNeeds.map((line) => [line.name, line.needed]))
    Object.values(lockedAssignment).forEach((room) => {
      if (remainingNeed.has(room)) remainingNeed.set(room, Math.max(0, (remainingNeed.get(room) ?? 0) - 1))
    })

    const unlockedColumns = sourceColumns.filter((name) => !lockedColumns.has(name))
    const lineOffsetUsed = unlockedColumns.length ? ((lastSnapshot?.lineRotationOffset ?? -1) + 1) % unlockedColumns.length : 0
    const rotated = unlockedColumns.length ? [...unlockedColumns.slice(lineOffsetUsed), ...unlockedColumns.slice(0, lineOffsetUsed)] : []

    const newAssignment: Record<string, string> = {}
    let cursor = 0
    lineNeeds.forEach((line) => {
      let need = remainingNeed.get(line.name) ?? 0
      while (need > 0 && cursor < rotated.length) {
        newAssignment[rotated[cursor]] = line.name
        cursor += 1
        need -= 1
      }
    })
    while (cursor < rotated.length) {
      newAssignment[rotated[cursor]] = "Suporte"
      cursor += 1
    }

    const columnToLine: Record<string, string> = { ...lockedAssignment, ...newAssignment }

    const groups = new Map<string, string[]>()
    sourceColumns.forEach((name) => {
      const line = columnToLine[name] || "Suporte"
      const list = groups.get(line) ?? []
      list.push(name)
      groups.set(line, list)
    })
    const lunchAssignment: Record<string, string> = {}
    groups.forEach((members) => {
      members.forEach((name, memberIndex) => {
        lunchAssignment[name] = lunchHours[(memberIndex + lunchOffsetUsed) % lunchHours.length]
      })
    })

    const next: Record<string, string[]> = {}
    sourceColumns.forEach((name) => {
      const room = columnToLine[name] || "Suporte"
      const lunch = lunchAssignment[name]
      next[name] = hours.map((hour, rowIndex) => {
        if (lockedCells.has(`${name}::${rowIndex}`)) return assignments[name]?.[rowIndex] ?? ""
        if (rowIndex === 0) return room
        if (hour === "17:00") return "Limpeza"
        if (hour === "18:00") return "Saída"
        if (hour === lunch) return `Almoço (${lunch})`
        return room
      })
    })

    const snapshot: ScheduleSnapshot = {
      id: `schedule-board-${Date.now()}`,
      date,
      shift,
      hours: [...hours],
      positions: [...positions],
      columns: [...sourceColumns],
      assignments: next,
      lunchOffset: lunchOffsetUsed,
      lineRotationOffset: lineOffsetUsed,
      lockedColumns: Array.from(lockedColumns),
      lockedCells: Array.from(lockedCells),
    }
    const nextHistory = [...history, snapshot]
    setAssignments(next)
    setHistory(nextHistory)
    setActiveSnapshotId(snapshot.id)
    await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "schedule_board_history", value: nextHistory }) })
  }

  async function deleteSnapshot(id: string) {
    const nextHistory = history.filter((snapshot) => snapshot.id !== id)
    setHistory(nextHistory)
    if (activeSnapshotId === id) setActiveSnapshotId(null)
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
    setLockedColumns(new Set(snapshot.lockedColumns ?? []))
    setLockedCells(new Set(snapshot.lockedCells ?? []))
  }

  function updateCell(column: string, rowIndex: number, value: string) {
    const hour = hours[rowIndex]
    if (LOCKED_HOURS.has(hour)) return
    if (lockedCells.has(`${column}::${rowIndex}`)) return
    setAssignments((current) => {
      const existing = current[column] ?? Array(hours.length).fill("")
      if (rowIndex === 0) {
        const room = roomOf(value)
        return { ...current, [column]: existing.map((entry, index) => {
          if (index === 0) return value
          if (lockedCells.has(`${column}::${index}`)) return entry
          if (hours[index] === "17:00") return "Limpeza"
          if (hours[index] === "18:00") return "Saída"
          if (entry?.startsWith("Almoço")) return entry
          return room
        }) }
      }
      return { ...current, [column]: existing.map((entry, index) => index === rowIndex ? value : entry) }
    })
  }

  function toggleColumnLock(column: string) {
    setLockedColumns((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  }

  function toggleCellLock(column: string, rowIndex: number) {
    const key = `${column}::${rowIndex}`
    setLockedCells((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function addColumn() {
    setColumns((current) => [...current, `Colaborador ${current.length + 1}`])
  }

  function addRow() {
    setHours((current) => [...current, ""])
    setPositions((current) => [...current, ""])
  }

  function removeColumn(index: number) {
    const name = columns[index]
    setColumns((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setLockedColumns((current) => {
      const next = new Set(current)
      next.delete(name)
      return next
    })
    setLockedCells((current) => {
      const next = new Set(Array.from(current).filter((key) => !key.startsWith(`${name}::`)))
      return next
    })
  }

  function removeRow(index: number) {
    if (LOCKED_HOURS.has(hours[index])) return
    setHours((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setPositions((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 lg:flex-row lg:items-end lg:justify-between">
        <div><CardTitle>Quadro de horários</CardTitle><CardDescription>Turno 1 · 09:00–18:00 · 17:00 é sempre limpeza e 18:00 é sempre saída · rotação por linha de produção.</CardDescription></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1"><Label htmlFor="schedule-date">Dia</Label><Input id="schedule-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9" /></div>
          <div className="grid gap-1"><Label htmlFor="shift-select">Turno</Label><Select value={shift} onValueChange={setShift}><SelectTrigger id="shift-select" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="turno1">Turno 1 · 09–18</SelectItem></SelectContent></Select></div>
          <Button variant="outline" onClick={generateFromWorkers} disabled={!workerNames.length}><UsersRound data-icon="inline-start" />Gerar trabalhadores</Button>
          <Button onClick={generateFromManual}><WandSparkles data-icon="inline-start" />Gerar manual</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addColumn}><Plus data-icon="inline-start" />Colaborador</Button>
          <Button variant="outline" size="sm" onClick={addRow}><Plus data-icon="inline-start" />Linha</Button>
          <span className="self-center text-xs text-muted-foreground">Escreva os nomes, escolha a linha/Suporte e use o cadeado para fixar linhas ou horas específicas.</span>
        </div>
        <div className="relative overflow-x-auto rounded-md border">
          <table className="min-w-[1050px] w-full border-collapse text-sm">
            <caption className="sr-only">Horário de {dateLabel(date)}</caption>
            <thead>
              <tr className="bg-muted/60"><th colSpan={columns.length + 2} className="border px-3 py-2 text-center text-base font-bold">{dateLabel(date)}</th></tr>
              <tr className="bg-muted/40">
                <th className="border px-2 py-2">Horas</th>
                {columns.map((column, index) => (
                  <th key={`worker-column-${index}`} className="min-w-40 border p-2 align-top">
                    <div className="space-y-1">
                      <Input value={column} onChange={(event) => setColumns((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Nome / posto" className="h-8 text-center font-semibold" />
                      <div className="flex items-center gap-1">
                        <Select value={selectValueForColumn(column)} onValueChange={(value) => updateCell(column, 0, value)}>
                          <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue placeholder="Suporte / Linha" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Suporte">Suporte</SelectItem>
                            {activeLines.map((line) => <SelectItem key={line.id} value={line.name}>{line.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={lockedColumns.has(column) ? `Destrancar linha de ${column}` : `Trancar linha de ${column}`} onClick={() => toggleColumnLock(column)}>
                          {lockedColumns.has(column) ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Remover colaborador" onClick={() => removeColumn(index)}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="border px-2 py-2">Horas*</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((hour, rowIndex) => {
                const fixedHour = LOCKED_HOURS.has(hour)
                return (
                  <tr key={`${hour}-${rowIndex}`} className={rowIndex % 2 ? "bg-background" : "bg-muted/20"}>
                    <th className="border p-2">
                      <Input value={hour} disabled={fixedHour} onChange={(event) => setHours((current) => current.map((item, index) => index === rowIndex ? event.target.value : item))} className="h-8 w-20 font-medium" />
                    </th>
                    {columns.map((column, columnIndex) => {
                      const cellKey = `${column}::${rowIndex}`
                      const locked = lockedCells.has(cellKey)
                      const value = assignments[column]?.[rowIndex] ?? positions[rowIndex] ?? ""
                      return (
                        <td key={`worker-cell-${columnIndex}-${rowIndex}`} className="border p-1">
                          {fixedHour ? (
                            <Input value={value} disabled className="h-8 text-center text-xs" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <Input
                                value={value}
                                disabled={locked}
                                onChange={(event) => updateCell(column, rowIndex, event.target.value)}
                                className={lunchHours.includes(hour) && value?.startsWith("Almoço") ? "h-8 flex-1 text-center text-xs font-bold text-primary" : "h-8 flex-1 text-center text-xs"}
                              />
                              <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label={locked ? `Destrancar ${hour} de ${column}` : `Trancar ${hour} de ${column}`} onClick={() => toggleCellLock(column, rowIndex)}>
                                {locked ? <Lock className="size-3" /> : <LockOpen className="size-3 text-muted-foreground" />}
                              </Button>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="border p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>{hour}</span>
                        {!fixedHour && <Button variant="ghost" size="icon" aria-label="Remover linha" onClick={() => removeRow(rowIndex)}><Trash2 className="size-4" /></Button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!columns.length && <p className="p-6 text-center text-sm text-muted-foreground">Adicione trabalhadores ou um colaborador manualmente para começar.</p>}
        {history.length > 0 && <section className="space-y-3 border-t pt-4" aria-labelledby="schedule-history-title">
          <div><h2 id="schedule-history-title" className="text-lg font-semibold">Horários anteriores</h2><p className="text-sm text-muted-foreground">Consulte horários já gerados sem substituir o quadro atual.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{history.slice().reverse().map((snapshot) => <Card key={snapshot.id} className={snapshot.id === activeSnapshotId ? "border-primary" : ""}><CardHeader className="p-4"><CardTitle className="text-base">{dateLabel(snapshot.date)}</CardTitle><CardDescription>{snapshot.shift === "turno1" ? "Turno 1 · 09:00–18:00" : snapshot.shift} · {snapshot.columns.length} colaboradores</CardDescription></CardHeader><CardContent className="flex items-center gap-2 p-4 pt-0"><Button variant={snapshot.id === activeSnapshotId ? "secondary" : "outline"} size="sm" onClick={() => loadSnapshot(snapshot)}>Consultar horário</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteSnapshot(snapshot.id)}><Trash2 data-icon="inline-start" />Eliminar</Button></CardContent></Card>)}</div>
        </section>}
      </CardContent>
    </Card>
  )
}
