"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, ListTodo, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabase } from "@/lib/supabase-client"

type Worker = { id: string; name: string }
type MonthlyTask = { id: string; description: string; frequency: "daily" | "twice-weekly" }
type MonthlyPlan = { month: string; tasks: MonthlyTask[]; assignments: Record<string, Record<string, string>>; createdAt: string }

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

function monthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const total = new Date(year, monthNumber, 0).getDate()
  return Array.from({ length: total }, (_, index) => new Date(year, monthNumber - 1, index + 1))
}

export function MonthlyTasksPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [plan, setPlan] = useState<MonthlyPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const days = useMemo(() => monthDays(month), [month])

  useEffect(() => {
    void Promise.all([
      getSupabase().from("workers").select("id, name").order("name").then(({ data }) => setWorkers((data ?? []) as Worker[])),
      fetch(`/api/monthly-tasks?month=${month}`).then((response) => response.ok ? response.json() : null).then((data) => setPlan(data)),
    ])
  }, [month])

  const generate = async () => {
    if (!workers.length) return
    setSaving(true)
    const assignments: Record<string, Record<string, string>> = {}
    tasks.forEach((task, taskIndex) => {
      assignments[task.id] = {}
      days.forEach((day, dayIndex) => {
        const isTwiceWeekly = task.frequency === "twice-weekly"
        const active = !isTwiceWeekly || day.getDay() === 2 || day.getDay() === 5
        if (active) assignments[task.id][day.toISOString().slice(0, 10)] = workers[(taskIndex + Math.floor(dayIndex / (isTwiceWeekly ? 3 : 1))) % workers.length].name
      })
    })
    const nextPlan = { month, tasks, assignments, createdAt: new Date().toISOString() }
    const response = await fetch("/api/monthly-tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextPlan) })
    if (response.ok) setPlan(await response.json())
    setSaving(false)
  }

  const activePlan = plan ?? { month, tasks, assignments: {}, createdAt: "" }
  return <main className="min-h-screen bg-background p-4 sm:p-6"><div className="mx-auto max-w-[1900px] space-y-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Link href="/"><Button variant="ghost" size="icon" aria-label="Voltar"><ArrowLeft /></Button></Link><div><p className="text-sm text-muted-foreground">Gestão operacional</p><h1 className="text-2xl font-bold tracking-tight">Tarefas mensais</h1></div></div><div className="flex items-end gap-3"><div className="grid gap-1"><Label htmlFor="month">Mês</Label><Input id="month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div><Button onClick={() => void generate()} disabled={saving || !workers.length}><WandSparkles data-icon="inline-start" />{saving ? "A gerar..." : "Gerar"}</Button></div></div><div className="rounded-xl border bg-card shadow-sm"><div className="flex items-center gap-2 border-b px-4 py-3"><CalendarDays className="text-primary" /><h2 className="font-semibold">Escala mensal · {new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(new Date(`${month}-01`))}</h2></div><div className="overflow-auto"><table className="min-w-[1500px] border-collapse text-xs"><thead><tr className="bg-muted/60"><th className="sticky left-0 z-10 min-w-[330px] border p-2 text-left">Tarefas</th>{days.map((day) => <th key={day.toISOString()} className="min-w-[72px] border p-2 text-center"><div>{new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(day).replace(".", "")}</div><div>{day.getDate()}</div></th>)}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="even:bg-muted/20"><td className="sticky left-0 z-10 border bg-card p-3 font-medium">{task.description}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{task.frequency === "daily" ? "Diária" : "2x por semana"}</span></td>{days.map((day) => <td key={day.toISOString()} className="border p-2 text-center">{activePlan.assignments[task.id]?.[day.toISOString().slice(0, 10)] ?? "—"}</td>)}</tr>)}</tbody></table></div></div>{!workers.length && <p className="text-sm text-destructive">Adicione operadores em Trabalhadores antes de gerar a escala.</p>}<div className="flex items-center gap-2 text-sm text-muted-foreground"><ListTodo />As tarefas mantêm-se fixas; a geração distribui e roda apenas os operadores.</div></div></main>
}
