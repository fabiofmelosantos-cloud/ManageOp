"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronUp, Lock, Trash2, Unlock, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { getSupabase } from "@/lib/supabase-client"

type Worker = { id: string; name: string }
type Vacation = { worker_id: string; start_date: string; end_date: string }
type MonthlyTask = { id: string; description: string; frequency: "daily" | "twice-weekly" }
type MonthlyPlan = { month: string; tasks: MonthlyTask[]; assignments: Record<string, Record<string, string>>; lockedTasks?: Record<string, string>; createdAt: string }

const tasks: MonthlyTask[] = [
  { id: "dispensers", description: "Avaliar/carregar dispensadores de sabonete, papel higiénico e mãos, álcool-gel, EPIs", frequency: "daily" },
  { id: "waste", description: "Despejar lixos (sala técnica, balneários, copa, corredores e lava-mãos)", frequency: "daily" },
  { id: "common-floor", description: "Limpeza do chão das zonas comuns (corredor, antecâmara e sala técnica)", frequency: "daily" },
  { id: "warehouse-office", description: "Limpeza do escritório do armazém e chão do armazém", frequency: "twice-weekly" },
  { id: "warehouse-waste", description: "Despejar lixos do corredor sujos e armazém", frequency: "twice-weekly" },
  { id: "wash-hands", description: "Limpeza de lava-mãos, zonas comuns, dispensadores, caixote e extintor", frequency: "twice-weekly" },
  { id: "hygiene-mat", description: "Limpar tapete de higiene e adicionar solução no tapete", frequency: "twice-weekly" },
  { id: "cloths", description: "Lavar e secar panos e mopas e guardar no armário", frequency: "daily" },
]

function monthDays(month: string) { const [year, monthNumber] = month.split("-").map(Number); const total = new Date(year, monthNumber, 0).getDate(); return Array.from({ length: total }, (_, index) => new Date(year, monthNumber - 1, index + 1)) }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }
function isWorkingDay(date: Date) { return date.getDay() !== 0 && date.getDay() !== 6 }
function firstWorkingDay(days: Date[]) { return days.find(isWorkingDay) }
// 0 = segunda ... 4 = sexta
function weekdayIndex(date: Date) { return (date.getDay() + 6) % 7 }
// Para tarefas "2x por semana", a segunda ocorrência respeita um dia de intervalo
// (ex.: 1º dia escrito à quarta => repete à sexta, com quinta como dia de intervalo).
function isPeriodicDay(task: MonthlyTask, anchorDate: Date | undefined, day: Date) {
  if (task.frequency === "daily") return true
  const anchorIndex = anchorDate ? weekdayIndex(anchorDate) : 1
  const secondIndex = (anchorIndex + 2) % 5
  const dayIndex = weekdayIndex(day)
  return dayIndex === anchorIndex || dayIndex === secondIndex
}
function isOnVacation(vacations: Vacation[], worker: Worker, date: string) { return vacations.some((vacation) => vacation.worker_id === worker.id && date >= vacation.start_date && date <= vacation.end_date) }
function formatMonthLabel(month: string) { const date = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00`) : new Date(); return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(date) }

export function MonthlyTasksPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [generateMonth, setGenerateMonth] = useState(currentMonth)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [plan, setPlan] = useState<MonthlyPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [consultCollapsed, setConsultCollapsed] = useState(false)
  const days = useMemo(() => monthDays(month), [month])

  useEffect(() => { void Promise.all([
    import("@/lib/storage").then(({ loadWorkers }) => loadWorkers()).then((data) => setWorkers((data ?? []).map((worker) => ({ id: worker.id, name: worker.name })))),
    getSupabase().from("vacation_requests").select("worker_id, start_date, end_date").eq("status", "approved").then(({ data }: { data: Vacation[] | null }) => setVacations(data ?? [])).catch(() => setVacations([])),
    fetch(`/api/monthly-tasks?month=${month}`).then((response) => response.ok ? response.json() : null).then((data) => setPlan(data)),
  ]) }, [month])

  const persist = async (assignments: Record<string, Record<string, string>>, lockedTasks = plan?.lockedTasks ?? {}, targetMonth = month) => {
    const response = await fetch("/api/monthly-tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: targetMonth, tasks, assignments, lockedTasks, createdAt: new Date().toISOString() }) })
    if (!response.ok) { window.alert("Não foi possível guardar a escala. Tente novamente."); return }
    setPlan(await response.json())
  }

  const clearScale = async () => {
    if (!window.confirm(`Limpar a escala de ${monthLabel}? Esta ação remove os nomes e cadeados deste mês.`)) return
    setSaving(true)
    try {
      const emptyAssignments = Object.fromEntries(tasks.map((task) => [task.id, {}]))
      await persist(emptyAssignments, {})
    } catch (error) {
      console.error("[v0] Falha ao limpar escala:", error)
      window.alert("Não foi possível limpar a escala. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const generate = async () => {
    if (!workers.length || !generateMonth) return
    setSaving(true)
    try {
      const assignments: Record<string, Record<string, string>> = {}
      const targetDays = monthDays(generateMonth)
      const lockedTasks = plan?.lockedTasks ?? {}
      // Se o mês em edição já tiver nomes escritos manualmente para o mês a gerar,
      // esse nome marca o primeiro dia da tarefa e a periodicidade é respeitada a partir dele.
      const seedAssignments = plan?.month === generateMonth ? plan?.assignments ?? {} : {}
      tasks.forEach((task, taskIndex) => {
        assignments[task.id] = {}
        const taskSeed = seedAssignments[task.id] ?? {}
        const anchorDate = Object.keys(taskSeed).filter((date) => taskSeed[date]?.trim()).sort()[0]
        const anchorName = anchorDate ? taskSeed[anchorDate].trim() : undefined
        const anchorDay = anchorDate ? new Date(`${anchorDate}T12:00:00`) : undefined
        targetDays.forEach((day, dayIndex) => {
          if (!isWorkingDay(day)) return
          const date = localDateKey(day)
          if (!isPeriodicDay(task, anchorDay, day)) return
          const lockedWorker = workers.find((worker) => worker.name === lockedTasks[task.id])
          if (lockedWorker && !isOnVacation(vacations, lockedWorker, date)) { assignments[task.id][date] = lockedWorker.name; return }
          if (anchorName && date >= anchorDate!) {
            const anchorWorker = workers.find((worker) => worker.name.toLocaleLowerCase() === anchorName.toLocaleLowerCase())
            if (!anchorWorker || !isOnVacation(vacations, anchorWorker, date)) { assignments[task.id][date] = anchorName; return }
          }
          const availableWorkers = workers.filter((worker) => !isOnVacation(vacations, worker, date))
          if (availableWorkers.length) assignments[task.id][date] = availableWorkers[(taskIndex + dayIndex) % availableWorkers.length].name
        })
      })
      await persist(assignments, lockedTasks, generateMonth)
      if (generateMonth !== month) setMonth(generateMonth)
    } catch (error) {
      console.error("[v0] Falha ao gerar escala:", error)
      window.alert("Não foi possível gerar a escala. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const updateAssignment = async (taskId: string, date: string, value: string) => {
    const assignments = Object.fromEntries(tasks.map((task) => [task.id, { ...(plan?.assignments?.[task.id] ?? {}) }]))
    const normalizedName = value.trim()
    assignments[taskId][date] = normalizedName

    // O primeiro nome escrito numa tarefa passa a ser o modelo a partir desse dia, em qualquer dia útil.
    const task = tasks.find((item) => item.id === taskId)
    if (task && normalizedName) {
      const worker = workers.find((item) => item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())
      const anchorDay = new Date(`${date}T12:00:00`)
      for (const day of days) {
        const dayDate = localDateKey(day)
        if (dayDate < date || !isWorkingDay(day)) continue
        if (isPeriodicDay(task, anchorDay, day) && (!worker || !isOnVacation(vacations, worker, dayDate))) assignments[taskId][dayDate] = normalizedName
      }
    }

    setSavingCell(`${taskId}-${date}`)
    await persist(assignments)
    setSavingCell(null)
  }

  const toggleLock = async (taskId: string) => {
    const taskAssignments = plan?.assignments?.[taskId] ?? {}
    const firstName = Object.values(taskAssignments).find(Boolean) ?? ""
    const lockedTasks = { ...(plan?.lockedTasks ?? {}) }
    if (lockedTasks[taskId]) delete lockedTasks[taskId]
    else if (firstName) lockedTasks[taskId] = firstName
    await persist(Object.fromEntries(tasks.map((task) => [task.id, { ...(plan?.assignments?.[task.id] ?? {}) }])), lockedTasks)
  }

  const activePlan = plan ?? { month, tasks, assignments: {}, lockedTasks: {}, createdAt: "" }
  const monthLabel = formatMonthLabel(month)
  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Voltar">
              <ArrowLeft />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Gestão operacional</p>
            <h1 className="text-2xl font-bold tracking-tight">Tarefas mensais</h1>
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Gerar escala mensal</CardTitle>
              <CardDescription>
                Todos os dias úteis (seg-sex) estão desbloqueados para edição; fim de semana é ignorado. Para definir o 1º dia de uma tarefa: escreva o nome no dia de início que quiser (não precisa de ser o dia 1) — a periodicidade repete a partir desse dia (tarefas &quot;2x por semana&quot; repetem 3 dias úteis depois). Use o cadeado para fixar uma tarefa no mesmo operador todo o mês.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label htmlFor="month">Mês a visualizar</Label>
                <Input id="month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-9" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="generate-month">Mês a gerar</Label>
                <Input id="generate-month" type="month" value={generateMonth} onChange={(event) => setGenerateMonth(event.target.value)} className="h-9" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void clearScale()} disabled={saving}>
                  <Trash2 data-icon="inline-start" />Limpar escala
                </Button>
                <Button onClick={() => void generate()} disabled={saving || !workers.length || !generateMonth}>
                  <WandSparkles data-icon="inline-start" />{saving ? "A gerar..." : `Gerar ${formatMonthLabel(generateMonth)}`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="font-semibold">Escala mensal gerada · {monthLabel}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{workers.length} operadores</Badge>
                <Badge variant="outline">{vacations.length} períodos de férias considerados</Badge>
              </div>
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="min-w-[1500px] border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="sticky left-0 z-10 min-w-[330px] border p-2 text-left">Tarefas</th>
                    {days.map((day) => <th key={day.toISOString()} className={`min-w-[86px] border p-2 text-center ${day.getDay() === 0 || day.getDay() === 6 ? "text-muted-foreground" : ""}`}><div>{new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(day).replace(".", "")}</div><div>{day.getDate()}</div></th>)}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => <tr key={task.id} className="even:bg-muted/20"><td className="sticky left-0 z-10 border bg-card p-3"><div className="flex items-end justify-between gap-2"><div><p className="font-medium">{task.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{task.frequency === "daily" ? "Diária" : "2x por semana"}</p></div><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label={activePlan.lockedTasks?.[task.id] ? `Desbloquear ${task.description}` : `Bloquear ${task.description}`} onClick={() => void toggleLock(task.id)}>{activePlan.lockedTasks?.[task.id] ? <Lock className="text-primary" /> : <Unlock className="text-muted-foreground" />}</Button></div></td>{days.map((day) => { const date = localDateKey(day); const weekend = day.getDay() === 0 || day.getDay() === 6; const active = !weekend; return <td key={date} className={`border p-1 align-middle ${!active ? "bg-muted/30" : ""}`}>{active && <Input aria-label={`${task.description} ${date}`} defaultValue={activePlan.assignments?.[task.id]?.[date] ?? ""} disabled={Boolean(activePlan.lockedTasks?.[task.id])} onBlur={(event) => { if (event.target.value !== activePlan.assignments?.[task.id]?.[date]) void updateAssignment(task.id, date, event.target.value) }} className="h-8 min-w-[78px] border-0 bg-transparent px-1 text-center text-xs" />}{savingCell === `${task.id}-${date}` && <span className="sr-only">A guardar</span>}</td> })}</tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/20">
            <div>
              <CardTitle>Quadro gerado para consulta · {monthLabel}</CardTitle>
              <CardDescription>
                Vista apenas de leitura da escala gerada, para consulta e histórico. No futuro, apenas o administrador terá acesso ao quadro de edição acima; os restantes utilizadores consultam aqui.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setConsultCollapsed((current) => !current)}>
              {consultCollapsed ? <ChevronDown data-icon="inline-start" /> : <ChevronUp data-icon="inline-start" />}
              {consultCollapsed ? "Maximizar" : "Minimizar"}
            </Button>
          </CardHeader>
          {!consultCollapsed && (
            <CardContent className="space-y-3 p-3">
              <div className="overflow-auto rounded-md border">
                <table className="min-w-[1500px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="sticky left-0 z-10 min-w-[330px] border p-2 text-left">Tarefas</th>
                      {days.map((day) => <th key={day.toISOString()} className={`min-w-[86px] border p-2 text-center ${day.getDay() === 0 || day.getDay() === 6 ? "text-muted-foreground" : ""}`}><div>{new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(day).replace(".", "")}</div><div>{day.getDate()}</div></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => <tr key={task.id} className="even:bg-muted/20"><td className="sticky left-0 z-10 border bg-card p-3"><p className="font-medium">{task.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{task.frequency === "daily" ? "Diária" : "2x por semana"}</p></td>{days.map((day) => { const date = localDateKey(day); const weekend = day.getDay() === 0 || day.getDay() === 6; const name = activePlan.assignments?.[task.id]?.[date] ?? ""; return <td key={date} className={`border p-1 text-center align-middle ${weekend ? "bg-muted/30" : ""}`}>{name}</td> })}</tr>)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  )
}
