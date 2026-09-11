"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import { ArrowLeft, CalendarDays, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlanningPage() {
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([])
  const [tasks, setTasks] = useState<{ description: string; worker: string }[]>([])
  useEffect(() => { import("@/lib/storage").then(async ({ loadWorkers, getWorkers }) => { await loadWorkers(); setWorkers(getWorkers()) }) }, [])
  const generateTasks = () => {
    const descriptions = ["Limpeza das zonas comuns", "Reposição de consumíveis", "Verificação dos dispensadores", "Organização do armazém", "Higienização dos equipamentos"]
    setTasks(descriptions.map((description, index) => ({ description, worker: workers.length ? workers[(index + new Date().getMonth()) % workers.length].name : "A aguardar operadores" })))
  }

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar ao dashboard">
            <Link href="/"><ArrowLeft data-icon="inline-start" /></Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Gestão de produção</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Planeamento</h1>
          </div>
        </div>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays aria-hidden="true" /></div>
              <div><CardTitle>Planeamento de produção</CardTitle><CardDescription>Organize os planos e necessidades de produção da fábrica.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Quadro mensal de tarefas com rotação automática, sem repetir a distribuição do mês anterior.</p><Button onClick={generateTasks}><WandSparkles className="mr-2 size-4" />Gerar tarefas</Button></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[600px] text-sm"><thead><tr className="bg-muted/60 text-left"><th className="p-3">Tarefa</th><th className="p-3">Seg</th><th className="p-3">Ter</th><th className="p-3">Qua</th><th className="p-3">Qui</th><th className="p-3">Sex</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.description} className="border-t"><td className="p-3 font-medium">{task.description}</td>{["Seg", "Ter", "Qua", "Qui", "Sex"].map((day) => <td key={day} className="p-3">{task.worker}</td>)}</tr>)}</tbody></table></div>{tasks.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Clique em “Gerar tarefas” para criar a distribuição mensal.</p>}</CardContent>
        </Card>
      </div>
    </main>
  )
}

