"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, WandSparkles, UsersRound, Lock, LockOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EXTRA_POSITIONS, type ProductionLine, type Worker } from "@/lib/types"

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
  lunchMode?: "rotativo" | "fixo"
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))
}

function roomOf(value: string) {
  return (value ?? "").split("/")[0].trim()
}

function SnapshotTable({ snapshot }: { snapshot: ScheduleSnapshot }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-[900px] w-full border-collapse text-sm">
        <caption className="sr-only">Horário de {dateLabel(snapshot.date)}</caption>
        <thead>
          <tr className="bg-muted/40">
            <th className="border px-2 py-2">Horas</th>
            {snapshot.columns.map((column, index) => (
              <th key={`snap-col-${snapshot.id}-${index}`} className="min-w-32 border px-2 py-2 text-center font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshot.hours.map((hour, rowIndex) => (
            <tr key={`snap-row-${snapshot.id}-${rowIndex}`} className={rowIndex % 2 ? "bg-background" : "bg-muted/20"}>
              <th className="border p-2 text-xs font-medium">{hour}</th>
              {snapshot.columns.map((column, columnIndex) => {
                const value = snapshot.assignments[column]?.[rowIndex] ?? ""
                return (
                  <td key={`snap-cell-${snapshot.id}-${columnIndex}-${rowIndex}`} className={value.startsWith("Almoço") ? "border p-1 text-center text-xs font-bold text-primary" : "border p-1 text-center text-xs"}>
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ShiftOneBoard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [shift, setShift] = useState("turno1")
  const [hours, setHours] = useState(defaultHours)
  const [positions, setPositions] = useState(defaultPositions)
  const [columns, setColumns] = useState<string[]>(() => Array.from({ length: 7 }, (_, index) => `Colaborador ${index + 1}`))
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [workPositions, setWorkPositions] = useState<string[]>([])
  const [history, setHistory] = useState<ScheduleSnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [lockedColumns, setLockedColumns] = useState<Set<string>>(new Set())
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set())
  const [collapsedSnapshots, setCollapsedSnapshots] = useState<Set<string>>(new Set())
  const [lunchMode, setLunchMode] = useState<"rotativo" | "fixo">("rotativo")

  useEffect(() => {
    let active = true
    void (async () => {
      const [{ loadWorkers, getWorkers, loadProductionLines, loadWorkPositions, getWorkPositions }, historyResponse] = await Promise.all([
        import("@/lib/storage"),
        fetch("/api/data?key=schedule_board_history"),
      ])
      const [loadedWorkers, lines, positionsFromSettings, historyPayload] = await Promise.all([
        loadWorkers().then(() => getWorkers()),
        loadProductionLines(),
        loadWorkPositions().then(() => getWorkPositions()),
        historyResponse.json(),
      ])
      if (!active) return
      const storedHistory = Array.isArray(historyPayload.data) ? historyPayload.data as ScheduleSnapshot[] : []
      setWorkers(loadedWorkers)
      setProductionLines(lines)
      setWorkPositions(positionsFromSettings.map((position) => position.name).filter(Boolean))
      setHistory(storedHistory)
      const latest = storedHistory[storedHistory.length - 1]
      if (latest) loadSnapshot(latest)
      else setColumns(loadedWorkers.map((worker) => worker.name).filter(Boolean).slice(0, 7).concat(Array.from({ length: Math.max(0, 7 - loadedWorkers.length) }, (_, index) => `Colaborador ${loadedWorkers.length + index + 1}`)))
    })().catch(() => {})
    return () => { active = false }
  }, [])

  const workerNames = useMemo(() => workers.map((worker) => worker.name).filter(Boolean), [workers])
  const activeLines = useMemo(() => productionLines.filter((line) => line.isActive), [productionLines])
  const lineNames = useMemo(() => activeLines.map((line) => line.name), [activeLines])
  const selectablePosts = useMemo(() => Array.from(new Set(["Suporte", ...lineNames, ...workPositions, ...EXTRA_POSITIONS.map((position) => position.name)])), [lineNames, workPositions])
  const lunchHours = lunchMode === "fixo" ? ["13:00"] : ["12:00", "13:00", "14:00"]

  function selectValueForColumn(column: string) {
    const room = roomOf(assignments[column]?.[0] ?? positions[0] ?? "")
    if (selectablePosts.includes(room)) return room
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

    // Durante o almoço, se uma linha ficar abaixo do mínimo de operadores por causa
    // de quem está a almoçar, reforça-se com colaboradores de Suporte que não estejam
    // a almoçar nessa hora. Fora dessa hora, esse colaborador continua em Suporte.
    const supportMembers = groups.get("Suporte") ?? []
    const borrowedByHour = new Map<string, Map<string, string>>()
    lunchHours.forEach((hour) => {
      lineNeeds.forEach((line) => {
        if (!line.needed) return
        const members = groups.get(line.name) ?? []
        if (!members.length) return
        const onLunch = members.filter((name) => lunchAssignment[name] === hour).length
        let shortfall = line.needed - (members.length - onLunch)
        if (shortfall <= 0) return
        const hourMap = borrowedByHour.get(hour) ?? new Map<string, string>()
        borrowedByHour.set(hour, hourMap)
        for (const supportName of supportMembers) {
          if (shortfall <= 0) break
          if (lunchAssignment[supportName] === hour) continue
          if (hourMap.has(supportName)) continue
          hourMap.set(supportName, line.name)
          shortfall -= 1
        }
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
        if (room === "Suporte") {
          const reinforceLine = borrowedByHour.get(hour)?.get(name)
          if (reinforceLine) return reinforceLine
        }
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
      lunchMode,
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
    setLunchMode(snapshot.lunchMode ?? "rotativo")
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

  function toggleSnapshotCollapse(id: string) {
    setCollapsedSnapshots((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
          <div className="grid gap-1"><Label htmlFor="lunch-mode-select">Almoço</Label><Select value={lunchMode} onValueChange={(value) => setLunchMode(value as "rotativo" | "fixo")}><SelectTrigger id="lunch-mode-select" className="h-9 w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rotativo">Rotativo · 12h–14h</SelectItem><SelectItem value="fixo">Fixo · 13h00</SelectItem></SelectContent></Select></div>
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
                            {selectablePosts.map((post) => <SelectItem key={post} value={post}>{post}</SelectItem>)}
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
          <div><h2 id="schedule-history-title" className="text-lg font-semibold">Quadros gerados</h2><p className="text-sm text-muted-foreground">Cada quadro gerado fica visível abaixo do quadro do dia. Use "Minimizar" para o recolher sem o perder.</p></div>
          <div className="flex flex-col gap-4">
            {history.slice().reverse().map((snapshot) => {
              const collapsed = collapsedSnapshots.has(snapshot.id)
              return (
                <Card key={snapshot.id} className={snapshot.id === activeSnapshotId ? "border-primary" : ""}>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-4">
                    <div><CardTitle className="text-base">{dateLabel(snapshot.date)}</CardTitle><CardDescription>{snapshot.shift === "turno1" ? "Turno 1 · 09:00–18:00" : snapshot.shift} · {snapshot.columns.length} colaboradores</CardDescription></div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleSnapshotCollapse(snapshot.id)}>
                        {collapsed ? <ChevronDown data-icon="inline-start" /> : <ChevronUp data-icon="inline-start" />}
                        {collapsed ? "Maximizar" : "Minimizar"}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteSnapshot(snapshot.id)}><Trash2 data-icon="inline-start" />Eliminar</Button>
                    </div>
                  </CardHeader>
                  {!collapsed && <CardContent className="p-4 pt-0"><SnapshotTable snapshot={snapshot} /></CardContent>}
                </Card>
              )
            })}
          </div>
        </section>}
      </CardContent>
    </Card>
  )
}
