"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { ArrowLeft, CalendarDays, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlanningPage() {
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([])
  const [tasks, setTasks] = useState<{ description: string; worker: string }[]>([])
  const [sourceUrl, setSourceUrl] = useState("")
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [sourceError, setSourceError] = useState("")
  useEffect(() => { import("@/lib/storage").then(async ({ loadWorkers, getWorkers, loadSpreadsheetSettings }) => { await loadWorkers(); setWorkers(getWorkers()); const settings = await loadSpreadsheetSettings(); setSourceUrl(settings.url) }) }, [])
  const loadProductionPlan = async () => {
    if (!sourceUrl) { setSourceError("Configure primeiro o link Excel/CSV em Configurações."); return }
    setSourceError("")
    try {
      const response = await fetch(sourceUrl)
      if (!response.ok) throw new Error("Não foi possível ler a fonte.")
      const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      setSourceRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }))
    } catch { setSourceError("Não foi possível ler o ficheiro Excel/CSV configurado.") }
  }
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
          <CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Consulte o planeamento de produção diretamente da fonte Excel/CSV configurada.</p><Button onClick={() => void loadProductionPlan}><WandSparkles className="mr-2 size-4" />Ler planeamento</Button></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[600px] text-sm"><thead><tr className="bg-muted/60 text-left">{(sourceRows.length ? Object.keys(sourceRows[0]) : ["Tarefa", "Responsável"]).map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody>{(sourceRows.length ? sourceRows : tasks.map((task) => ({ Tarefa: task.description, Responsável: task.worker }))).map((row, index) => <tr key={index} className="border-t">{Object.values(row).map((value, valueIndex) => <td key={valueIndex} className="p-3">{String(value ?? "")}</td>)}</tr>)}</tbody></table></div>{tasks.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Clique em “Ler planeamento” para carregar os dados do ficheiro configurado.</p>}</CardContent>
        </Card>
      </div>
    </main>
  )
}

