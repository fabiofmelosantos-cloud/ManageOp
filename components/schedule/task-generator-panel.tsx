"use client"

import { useMemo, useState } from "react"
import { Download, ListTodo, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { GeneratedTask, Worker } from "@/lib/types"

const TASKS = [
  "Avaliar/carregar dispensadores de sabonete, papel higiénico e mãos, álcool-gel, EPIs",
  "Despejar lixos (sala técnica, balneários, copa, corredores e lava-mãos)",
  "Limpeza do chão das zonas comuns",
  "Limpeza do escritório, armazém e chão do armazém",
  "Despejar lixos corredor sujos e armazém",
  "Limpeza de lava-mãos, dispensadores, caixote de lixo e extintor",
  "Limpar o tapete de higiene e adicionar a solução no tapete",
  "Lavar e secar panos e mopas e guardar no armário",
]

function weekDates(month: string, week: number) {
  const [year, monthNumber] = month.split("-").map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const monday = new Date(first)
  monday.setDate(1 + (week - 1) * 7)
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date })
}

export function TaskGeneratorPanel({ workers }: { workers: Worker[] }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [week, setWeek] = useState(1)
  const [tasks, setTasks] = useState<GeneratedTask[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const dates = useMemo(() => weekDates(month, week), [month, week])

  const generate = async () => {
    setIsGenerating(true)
    const { loadGeneratedTasks, saveGeneratedTasks } = await import("@/lib/storage")
    const previous = await loadGeneratedTasks()
    const previousMonth = previous.filter((task) => task.monthKey !== month).map((task) => task.description)
    const availableTasks = TASKS.filter((task) => !previousMonth.includes(task))
    const generated = dates.flatMap((date, dayIndex) => {
      if (!workers.length) return []
      return availableTasks.map((description, taskIndex) => ({
        id: `task_${Date.now()}_${dayIndex}_${taskIndex}`,
        description,
        date: date.toISOString().slice(0, 10),
        workerId: workers[(dayIndex + taskIndex) % workers.length].id,
        shift: "afternoon" as const,
        monthKey: month,
        week,
        createdAt: new Date().toISOString(),
      }))
    })
    const merged = [...previous.filter((task) => !(task.monthKey === month && task.week === week)), ...generated]
    await saveGeneratedTasks(merged)
    setTasks(generated)
    setIsGenerating(false)
  }

  const exportTasks = () => {
    const rows = [["Data", "Tarefa", "Colaborador"], ...tasks.map((task) => [task.date, task.description, workers.find((worker) => worker.id === task.workerId)?.name || ""])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\n")
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); link.download = `tarefas_${month}_semana_${week}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><ListTodo /> Gerar Tarefas</CardTitle><CardDescription>Distribua tarefas semanais pelos colaboradores registados. Ao mudar de mês, as tarefas do mês anterior são excluídas.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium">Mês<input className="h-10 rounded-md border bg-background px-3" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">Semana<select className="h-10 rounded-md border bg-background px-3" value={week} onChange={(event) => setWeek(Number(event.target.value))}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>Semana {value}</option>)}</select></label>
        <div className="flex items-end gap-2"><Button onClick={generate} disabled={isGenerating || workers.length === 0}>{isGenerating ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ListTodo data-icon="inline-start" />}Gerar tarefas automaticamente</Button>{tasks.length > 0 && <Button variant="outline" onClick={exportTasks}><Download data-icon="inline-start" />Exportar</Button>}</div>
      </div>
      {workers.length === 0 && <p className="text-sm text-destructive">Registe colaboradores antes de gerar tarefas.</p>}
      {tasks.length > 0 && <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tarefa</TableHead><TableHead>Colaborador</TableHead></TableRow></TableHeader><TableBody>{tasks.map((task) => <TableRow key={task.id}><TableCell>{new Date(task.date).toLocaleDateString("pt-PT")}</TableCell><TableCell className="whitespace-normal min-w-[320px]">{task.description}</TableCell><TableCell>{workers.find((worker) => worker.id === task.workerId)?.name}</TableCell></TableRow>)}</TableBody></Table>}
    </CardContent>
  </Card>
}
