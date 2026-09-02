"use client"

import { useMemo, useState } from "react"
import { Download, ListTodo, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function fortnightDates(month: string, week: number) {
  const [year, monthNumber] = month.split("-").map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const monday = new Date(year, monthNumber - 1, 1 - mondayOffset + (week - 1) * 7)
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function TaskGeneratorPanel({ workers }: { workers: Worker[] }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [week, setWeek] = useState(1)
  const [tasks, setTasks] = useState<GeneratedTask[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const dates = useMemo(() => fortnightDates(month, week), [month, week])

  const generate = async () => {
    if (!workers.length) return
    setIsGenerating(true)
    try {
      const { loadGeneratedTasks, saveGeneratedTasks } = await import("@/lib/storage")
      const previous = await loadGeneratedTasks()
      const previousMonthDescriptions = new Set(previous.filter((task) => task.monthKey !== month).map((task) => task.description))
      const availableTasks = TASKS.filter((task) => !previousMonthDescriptions.has(task))
      const generated = dates.flatMap((date, dayIndex) =>
        availableTasks.map((description, taskIndex) => ({
          id: `task_${Date.now()}_${dayIndex}_${taskIndex}`,
          description,
          date: date.toISOString().slice(0, 10),
          workerId: workers[(dayIndex + taskIndex) % workers.length].id,
          shift: "afternoon" as const,
          monthKey: month,
          week,
          createdAt: new Date().toISOString(),
        })),
      )
      const merged = [...previous.filter((task) => !(task.monthKey === month && task.week === week)), ...generated]
      await saveGeneratedTasks(merged)
      setTasks(generated)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportTasks = () => {
    const rows = [["Data", "Tarefa", "Colaborador"], ...tasks.map((task) => [task.date, task.description, workers.find((worker) => worker.id === task.workerId)?.name || ""])]
    const csv = rows.map((row) => row.map(csvValue).join(";")).join("\n")
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `tarefas_${month}_quinzena_${week}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const taskFor = (description: string, date: Date) => tasks.find((task) => task.description === description && task.date === date.toISOString().slice(0, 10))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListTodo data-icon="inline-start" /> Gerar quadro de tarefas</CardTitle>
        <CardDescription>Crie automaticamente um quadro para duas semanas com os colaboradores registados. As tarefas do mês anterior não são repetidas no novo mês.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium">Mês<input aria-label="Mês" className="h-10 rounded-md border bg-background px-3" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label className="flex flex-col gap-2 text-sm font-medium">Semana inicial<select aria-label="Semana inicial" className="h-10 rounded-md border bg-background px-3" value={week} onChange={(event) => setWeek(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>Semana {value}</option>)}</select></label>
          <div className="flex items-end gap-2"><Button onClick={generate} disabled={isGenerating || workers.length === 0}>{isGenerating ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ListTodo data-icon="inline-start" />} Gerar automaticamente</Button>{tasks.length > 0 && <Button variant="outline" onClick={exportTasks}><Download data-icon="inline-start" /> Exportar</Button>}</div>
        </div>
        {workers.length === 0 && <p className="text-sm text-destructive">Registe colaboradores antes de gerar tarefas.</p>}
        {tasks.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-[1180px] border-collapse text-xs"><caption className="sr-only">Quadro de tarefas para duas semanas</caption>
              <thead><tr className="bg-muted"><th className="sticky left-0 z-10 min-w-[300px] border p-2 text-left">Tarefas para serem realizadas às 23:00 (turno da tarde)</th>{dates.map((date) => <th key={date.toISOString()} className="min-w-[62px] border p-1 text-center"><span className="block font-semibold">{weekdays[date.getDay()]}</span><span>{date.getDate()}</span></th>)}</tr></thead>
              <tbody>{TASKS.filter((description) => tasks.some((task) => task.description === description)).map((description, rowIndex) => <tr key={description} className={rowIndex % 2 ? "bg-muted/50" : "bg-background"}><th className="sticky left-0 z-10 border p-2 text-left font-normal">{description}</th>{dates.map((date) => { const task = taskFor(description, date); return <td key={date.toISOString()} className="border p-1 text-center align-middle">{task ? workers.find((worker) => worker.id === task.workerId)?.name : "—"}</td> })}</tr>)}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
