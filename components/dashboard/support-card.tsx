"use client"

import { useEffect, useState } from "react"
import { LifeBuoy, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabase } from "@/lib/supabase-client"

type Worker = { id: string; name: string; employee_id?: string }
type SupportTask = { id: string; product: string; bagMeasure: string; quantityToLabel: number; quantityLabeled: number; operatorName: string; createdAt: string }

export function SupportCard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [tasks, setTasks] = useState<SupportTask[]>([])
  const [form, setForm] = useState({ product: "", bagMeasure: "", quantityToLabel: "", quantityLabeled: "", operatorId: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void Promise.all([
      fetch("/api/support-tasks").then((response) => response.json()).then(setTasks),
      getSupabase().from("workers").select("id, name, employee_id").order("name").then(({ data }) => setWorkers(data ?? [])),
    ])
  }, [])

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const operator = workers.find((worker) => worker.id === form.operatorId)
    if (!operator) return setError("Selecione o operador que executou a tarefa.")
    setSaving(true)
    setError("")
    const response = await fetch("/api/support-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantityToLabel: Number(form.quantityToLabel), quantityLabeled: Number(form.quantityLabeled), operatorName: operator.name }) })
    const result = await response.json()
    setSaving(false)
    if (!response.ok) return setError(result.error ?? "Não foi possível guardar o registro.")
    setTasks((current) => [result, ...current])
    setForm({ product: "", bagMeasure: "", quantityToLabel: "", quantityLabeled: "", operatorId: "" })
  }

  return <Card className="border-primary/20">
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><LifeBuoy className="size-5 text-primary" />Suporte</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <form onSubmit={addTask} className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor="support-product">Produto</Label><Input id="support-product" value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} required /></div>
        <div className="grid gap-1.5"><Label htmlFor="support-measure">Medida do saco</Label><Input id="support-measure" placeholder="Ex.: 25 kg" value={form.bagMeasure} onChange={(event) => setForm({ ...form, bagMeasure: event.target.value })} required /></div>
        <div className="grid gap-1.5"><Label htmlFor="support-to-label">Quantidade a colar</Label><Input id="support-to-label" type="number" min="0" value={form.quantityToLabel} onChange={(event) => setForm({ ...form, quantityToLabel: event.target.value })} required /></div>
        <div className="grid gap-1.5"><Label htmlFor="support-labeled">Quantidade já colada</Label><Input id="support-labeled" type="number" min="0" value={form.quantityLabeled} onChange={(event) => setForm({ ...form, quantityLabeled: event.target.value })} required /></div>
        <div className="grid gap-1.5 sm:col-span-2"><Label>Operador que executou a tarefa</Label><Select value={form.operatorId} onValueChange={(value) => setForm({ ...form, operatorId: value })}><SelectTrigger><SelectValue placeholder="Selecionar trabalhador" /></SelectTrigger><SelectContent>{workers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.name}{worker.employee_id ? ` · ${worker.employee_id}` : ""}</SelectItem>)}</SelectContent></Select></div>
        {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
        <Button type="submit" disabled={saving} className="sm:col-span-2"><Plus data-icon="inline-start" />{saving ? "A guardar..." : "Adicionar produto"}</Button>
      </form>
      <div className="flex flex-col gap-2"><h3 className="text-sm font-semibold">Registos adicionados</h3>{tasks.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum registo de suporte.</p> : tasks.map((task) => <div key={task.id} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-5"><div><p className="font-medium">{task.product}</p><p className="text-muted-foreground">Saco: {task.bagMeasure}</p></div><p><span className="text-muted-foreground">A colar:</span> {task.quantityToLabel}</p><p><span className="text-muted-foreground">Já colada:</span> {task.quantityLabeled}</p><p className="sm:col-span-2"><span className="text-muted-foreground">Operador:</span> {task.operatorName}</p><Badge variant="secondary" className="w-fit sm:col-span-5">{new Date(task.createdAt).toLocaleString("pt-PT")}</Badge></div>)}</div>
    </CardContent>
  </Card>
}
