"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { Worker } from "@/lib/types"

type IncidentType = "positive" | "negative" | "neutral"
type Incident = { id: string; workerId: string; workerName: string; date: string; type: IncidentType; description: string; score: number; period: string }
const periodNow = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? "H1" : "H2"}`
const labels: Record<IncidentType, string> = { positive: "Positiva", negative: "Negativa", neutral: "Neutra" }

export function IncidentEvaluationBoard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<IncidentType>("positive")
  const [description, setDescription] = useState("")
  const [score, setScore] = useState("1")
  const [period, setPeriod] = useState(periodNow)
  const [saving, setSaving] = useState(false)

  useEffect(() => { void Promise.all([import("@/lib/storage").then(async ({ loadWorkers, getWorkers }) => { await loadWorkers(); setWorkers(getWorkers()) }), import("@/lib/storage").then(async ({ loadEvaluationIncidents }) => setIncidents(await loadEvaluationIncidents()))]) }, [])
  const save = async (next: Incident[]) => { setSaving(true); const { saveEvaluationIncidents } = await import("@/lib/storage"); await saveEvaluationIncidents(next); setIncidents(next); setSaving(false) }
  const add = async () => { const worker = workers.find((item) => item.id === workerId); const clean = description.trim(); const points = Number(score); if (!worker || !clean || !Number.isFinite(points)) return; await save([...incidents, { id: `incident-${Date.now()}`, workerId, workerName: worker.name, date, type, description: clean, score: points, period }]); setDescription(""); setScore("1") }
  const remove = async (id: string) => save(incidents.filter((item) => item.id !== id))
  const summary = useMemo(() => workers.map((worker) => ({ worker, total: incidents.filter((item) => item.workerId === worker.id && item.period === period).reduce((sum, item) => sum + item.score, 0), count: incidents.filter((item) => item.workerId === worker.id && item.period === period).length })).filter((item) => item.count > 0).sort((a, b) => b.total - a.total), [workers, incidents, period])

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Registo de incidências dos operadores</CardTitle><CardDescription>Registe comportamentos positivos, negativos ou neutros e calcule a pontuação do período de avaliação.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <div className="grid gap-2 lg:col-span-2"><Label>Operador</Label><Select value={workerId} onValueChange={setWorkerId}><SelectTrigger><SelectValue placeholder="Selecionar operador" /></SelectTrigger><SelectContent>{workers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-2"><Label>Data</Label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      <div className="grid gap-2"><Label>Período</Label><Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2026-H1" /></div>
      <div className="grid gap-2"><Label>Tipo</Label><Select value={type} onValueChange={(value) => setType(value as IncidentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-2"><Label>Pontuação</Label><Input type="number" value={score} onChange={(event) => setScore(event.target.value)} /></div>
      <div className="grid gap-2 md:col-span-2 lg:col-span-5"><Label>Descrição da incidência</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva a ocorrência observada" /></div>
      <div className="flex items-end"><Button className="w-full" onClick={() => void add()} disabled={saving || !workerId || !description.trim()}><Plus data-icon="inline-start" />Registar incidência</Button></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Resumo da avaliação · {period}</CardTitle><CardDescription>Pontuação acumulada por operador no período selecionado.</CardDescription></CardHeader><CardContent>{summary.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não existem incidências neste período.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summary.map(({ worker, total, count }) => <div key={worker.id} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium">{worker.name}</p><Badge variant={total >= 0 ? "secondary" : "destructive"}>{total} pts</Badge></div><p className="mt-2 text-sm text-muted-foreground">{count} incidência(s)</p></div>)}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Histórico de incidências</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left"><th className="p-2">Data</th><th className="p-2">Operador</th><th className="p-2">Tipo</th><th className="p-2">Descrição</th><th className="p-2">Pontos</th><th className="p-2" /></tr></thead><tbody>{incidents.filter((item) => item.period === period).sort((a, b) => b.date.localeCompare(a.date)).map((item) => <tr key={item.id} className="border-b"><td className="p-2">{item.date}</td><td className="p-2">{item.workerName}</td><td className="p-2">{labels[item.type]}</td><td className="p-2">{item.description}</td><td className="p-2 font-medium">{item.score}</td><td className="p-2 text-right"><Button variant="ghost" size="icon" onClick={() => void remove(item.id)} aria-label="Eliminar incidência"><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div></CardContent></Card>
  </div>
}
