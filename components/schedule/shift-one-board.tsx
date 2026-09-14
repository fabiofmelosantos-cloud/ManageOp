"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, WandSparkles, UsersRound, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Worker } from "@/lib/types"

const qcQuestions = [
  { id: "zona", label: "Zona de produção limpa e sem objetos estranhos?" },
  { id: "arranque", label: "Teste de arranque executado?" },
  { id: "selamento", label: "Selamento validado?" },
  { id: "lote", label: "Lote validado?" },
]

const organolepticQuestion = { id: "organoletico", label: "Teste organolético com resultado ok?" }

const defaultHours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
const defaultPositions = ["Honetop / Selar", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop", "Honetop"]
type ScheduleSnapshot = { id: string; date: string; shift: string; hours: string[]; positions: string[]; columns: string[]; assignments: Record<string, string[]>; lunchOffset?: number }

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))
}

function roomOf(value: string) {
  return (value ?? "").split("/")[0].trim()
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

  const [qcAnswers, setQcAnswers] = useState<Record<string, Record<string, "ok" | "nok">>>({})
  const [qcOpen, setQcOpen] = useState(false)
  const [nowHour, setNowHour] = useState(() => `${String(new Date().getHours()).padStart(2, "0")}:00`)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBeepHourRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    void fetch(`/api/data?key=schedule_qc_${date}`).then((response) => response.json()).then((payload) => {
      if (!active) return
      setQcAnswers(payload.data && typeof payload.data === "object" ? payload.data : {})
    }).catch(() => {})
    return () => { active = false }
  }, [date])

  useEffect(() => {
    const tick = () => setNowHour(`${String(new Date().getHours()).padStart(2, "0")}:00`)
    tick()
    const timer = setInterval(tick, 30000)
    return () => clearInterval(timer)
  }, [])

  const currentQcHour = hours.includes(nowHour) && nowHour !== "17:00" && nowHour !== "18:00" ? nowHour : null
  const currentQuestions = currentQcHour === "09:00" ? [...qcQuestions, organolepticQuestion] : qcQuestions
  const currentAnswers = currentQcHour ? qcAnswers[currentQcHour] ?? {} : {}
  const answeredCount = currentQuestions.filter((question) => currentAnswers[question.id]).length
  const pendingQc = currentQcHour !== null && answeredCount < currentQuestions.length
  const hasNok = currentQuestions.some((question) => currentAnswers[question.id] === "nok")
  const lineBlocked = currentQcHour !== null && hasNok

  useEffect(() => {
    if (!pendingQc || !currentQcHour) return
    if (lastBeepHourRef.current === currentQcHour) return
    lastBeepHourRef.current = currentQcHour
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtxRef.current ?? new Ctx()
      audioCtxRef.current = ctx
      void ctx.resume?.()
      const beep = (delay: number) => {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.4)
        oscillator.start(ctx.currentTime + delay)
        oscillator.stop(ctx.currentTime + delay + 0.4)
      }
      beep(0)
      beep(0.55)
    } catch {}
  }, [pendingQc, currentQcHour])

  async function setQcAnswer(hour: string, questionId: string, answer: "ok" | "nok") {
    const next = { ...qcAnswers, [hour]: { ...(qcAnswers[hour] ?? {}), [questionId]: answer } }
    setQcAnswers(next)
    await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: `schedule_qc_${date}`, value: next }) })
  }

  async function buildSchedule(sourceColumns: string[]) {
    const lastOffset = history.length ? history[history.length - 1].lunchOffset ?? 0 : -1
    const offset = (lastOffset + 1) % lunchHours.length
    const next: Record<string, string[]> = {}
    sourceColumns.forEach((name, columnIndex) => {
      const firstHourValue = assignments[name]?.[0] || positions[0] || "Honetop / Selar"
      const room = roomOf(firstHourValue)
      const lunch = lunchHours[(columnIndex + offset) % lunchHours.length]
      next[name] = hours.map((hour, rowIndex) => {
        if (rowIndex === 0) return firstHourValue
        if (hour === "17:00") return "Limpeza"
        if (hour === "18:00") return "Saída"
        if (hour === lunch) return `Almoço (${lunch})`
        return room
      })
    })
    const snapshot: ScheduleSnapshot = { id: `schedule-board-${Date.now()}`, date, shift, hours: [...hours], positions: [...positions], columns: [...sourceColumns], assignments: next, lunchOffset: offset }
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
  }

  function updateCell(column: string, rowIndex: number, value: string) {
    setAssignments((current) => {
      const existing = current[column] ?? Array(hours.length).fill("")
      if (rowIndex === 0) {
        const room = roomOf(value)
        return { ...current, [column]: existing.map((entry, index) => {
          if (index === 0) return value
          if (hours[index] === "17:00") return "Limpeza"
          if (hours[index] === "18:00") return "Saída"
          if (entry?.startsWith("Almoço")) return entry
          return room
        }) }
      }
      return { ...current, [column]: existing.map((entry, index) => index === rowIndex ? value : entry) }
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
        {lineBlocked && <div className="flex items-center gap-2 rounded-md border border-red-600 bg-red-600/10 px-3 py-2 text-sm font-semibold text-red-700"><Mail className="size-4 shrink-0" />A linha Honetop não pode arrancar: existe uma resposta NOK no controlo de qualidade das {currentQcHour}. Corrija antes de iniciar.</div>}
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={addColumn}><Plus data-icon="inline-start" />Colaborador</Button><Button variant="outline" size="sm" onClick={addRow}><Plus data-icon="inline-start" />Linha</Button><span className="self-center text-xs text-muted-foreground">Escreva os nomes e posições diretamente no quadro.</span></div>
        <div className="relative overflow-x-auto rounded-md border"><Button type="button" variant={pendingQc ? "destructive" : "outline"} size="icon" aria-label="Controlo de qualidade da linha Honetop" title="Controlo de qualidade" onClick={() => setQcOpen(true)} className={pendingQc ? "absolute right-2 top-2 z-10 animate-pulse ring-2 ring-red-500" : "absolute right-2 top-2 z-10"}><Mail className="size-4" />{pendingQc && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">{currentQuestions.length - answeredCount}</span>}</Button><table className="min-w-[1050px] w-full border-collapse text-sm"><caption className="sr-only">Horário de {dateLabel(date)}</caption><thead><tr className="bg-muted/60"><th colSpan={columns.length + 2} className="border px-3 py-2 text-center text-base font-bold">{dateLabel(date)}</th></tr><tr className="bg-muted/40"><th className="border px-2 py-2">Horas</th>{columns.map((column, index) => <th key={`worker-column-${index}`} className="min-w-36 border p-2"><Input value={column} onChange={(event) => setColumns((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Nome / posto" className="h-8 text-center font-semibold" /><Button variant="ghost" size="icon" aria-label="Remover colaborador" onClick={() => removeColumn(index)}><Trash2 className="size-4" /></Button></th>)}<th className="border px-2 py-2">Horas*</th></tr></thead><tbody>{hours.map((hour, rowIndex) => <tr key={`${hour}-${rowIndex}`} className={rowIndex % 2 ? "bg-background" : "bg-muted/20"}><th className="border p-2"><Input value={hour} onChange={(event) => setHours((current) => current.map((item, index) => index === rowIndex ? event.target.value : item))} className="h-8 w-20 font-medium" /></th>{columns.map((column, columnIndex) => <td key={`worker-cell-${columnIndex}-${rowIndex}`} className="border p-1"><Input value={assignments[column]?.[rowIndex] ?? positions[rowIndex] ?? ""} onChange={(event) => updateCell(column, rowIndex, event.target.value)} className={lunchHours.includes(hour) && assignments[column]?.[rowIndex]?.startsWith("Almoço") ? "h-9 text-center font-bold text-primary" : "h-9 text-center"} /></td>)}<td className="border p-2 text-center"><div className="flex items-center justify-center gap-1"><span>{hour}</span><Button variant="ghost" size="icon" aria-label="Remover linha" onClick={() => removeRow(rowIndex)}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>
        {!columns.length && <p className="p-6 text-center text-sm text-muted-foreground">Adicione trabalhadores ou um colaborador manualmente para começar.</p>}
        {history.length > 0 && <section className="space-y-3 border-t pt-4" aria-labelledby="schedule-history-title">
          <div><h2 id="schedule-history-title" className="text-lg font-semibold">Horários anteriores</h2><p className="text-sm text-muted-foreground">Consulte horários já gerados sem substituir o quadro atual.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{history.slice().reverse().map((snapshot) => <Card key={snapshot.id} className={snapshot.id === activeSnapshotId ? "border-primary" : ""}><CardHeader className="p-4"><CardTitle className="text-base">{dateLabel(snapshot.date)}</CardTitle><CardDescription>{snapshot.shift === "turno1" ? "Turno 1 · 09:00–18:00" : snapshot.shift} · {snapshot.columns.length} colaboradores</CardDescription></CardHeader><CardContent className="flex items-center gap-2 p-4 pt-0"><Button variant={snapshot.id === activeSnapshotId ? "secondary" : "outline"} size="sm" onClick={() => loadSnapshot(snapshot)}>Consultar horário</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteSnapshot(snapshot.id)}><Trash2 data-icon="inline-start" />Eliminar</Button></CardContent></Card>)}</div>
        </section>}
      </CardContent>
      <Dialog open={qcOpen} onOpenChange={setQcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlo de qualidade{currentQcHour ? ` · ${currentQcHour}` : ""}</DialogTitle>
            <DialogDescription>Responda a todas as perguntas para autorizar o arranque da linha Honetop nesta hora. Uma resposta NOK impede o arranque.</DialogDescription>
          </DialogHeader>
          {currentQcHour ? (
            <div className="space-y-3">
              {currentQuestions.map((question) => {
                const answer = currentAnswers[question.id]
                return (
                  <div key={question.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <span className="text-sm">{question.label}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant={answer === "ok" ? "default" : "outline"} onClick={() => void setQcAnswer(currentQcHour, question.id, "ok")}>OK</Button>
                      <Button size="sm" variant={answer === "nok" ? "destructive" : "outline"} onClick={() => void setQcAnswer(currentQcHour, question.id, "nok")}>NOK</Button>
                    </div>
                  </div>
                )
              })}
              {hasNok && <p className="rounded-md bg-red-600/10 px-3 py-2 text-sm font-semibold text-red-700">Resposta NOK registada — a linha não pode arrancar até ser corrigida.</p>}
            </div>
          ) : <p className="text-sm text-muted-foreground">Fora do horário do turno (09:00–18:00). O controlo de qualidade fica disponível a cada hora do turno.</p>}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
