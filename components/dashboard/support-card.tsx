"use client"

import { useEffect, useState } from "react"
import { Check, ClipboardList, LifeBuoy, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabase } from "@/lib/supabase-client"

type Worker = { id: string; name: string; employee_id?: string }
type SupportTask = { id: string; product: string; bagMeasure: string; quantityToLabel: number; quantityLabeled: number; operatorName: string; createdAt: string; completed?: boolean }
type FormState = { product: string; bagMeasure: string; quantityToLabel: string; quantityLabeled: string; operatorId: string }

const emptyForm: FormState = { product: "", bagMeasure: "", quantityToLabel: "", quantityLabeled: "", operatorId: "" }

export function SupportCard() {
  const [open, setOpen] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [tasks, setTasks] = useState<SupportTask[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
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
    const response = await fetch("/api/support-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantityToLabel: Number(form.quantityToLabel), quantityLabeled: Number(form.quantityLabeled), operatorId: operator.id, operatorName: operator.name }) })
    const result = await response.json()
    setSaving(false)
    if (!response.ok) return setError(result.error ?? "Não foi possível guardar o registro.")
    setTasks((current) => [result, ...current])
    setForm(emptyForm)
  }

  async function toggleCompleted(task: SupportTask) {
    const completed = !task.completed
    const response = await fetch("/api/support-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed }) })
    if (!response.ok) return setError("Não foi possível validar a conclusão da tarefa.")
    const updated = await response.json() as SupportTask
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Card className="group aspect-square border-primary/20 transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]">
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center sm:p-3">
          <LifeBuoy className="size-8 text-primary" aria-hidden="true" />
          <CardTitle className="text-xs sm:text-sm">Suporte</CardTitle>
        </CardContent>
      </Card>
    </DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><LifeBuoy className="size-5 text-primary" />Máscara de suporte</DialogTitle><DialogDescription>Adicione produtos e valide cada tarefa assim que estiver concluída.</DialogDescription></DialogHeader>
      <div className="flex flex-col gap-6">
        <form onSubmit={addTask} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="support-product">Produto</Label><Input id="support-product" value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="support-measure">Medida do saco</Label><Input id="support-measure" placeholder="Ex.: 25 kg" value={form.bagMeasure} onChange={(event) => setForm({ ...form, bagMeasure: event.target.value })} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="support-to-label">Quantidade a colar</Label><Input id="support-to-label" type="number" min="0" value={form.quantityToLabel} onChange={(event) => setForm({ ...form, quantityToLabel: event.target.value })} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="support-labeled">Quantidade já colada</Label><Input id="support-labeled" type="number" min="0" value={form.quantityLabeled} onChange={(event) => setForm({ ...form, quantityLabeled: event.target.value })} required /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label>Operador que executou a tarefa</Label><Select value={form.operatorId} onValueChange={(value) => setForm({ ...form, operatorId: value })}><SelectTrigger><SelectValue placeholder="Selecionar trabalhador" /></SelectTrigger><SelectContent>{workers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.name}{worker.employee_id ? ` · ${worker.employee_id}` : ""}</SelectItem>)}</SelectContent></Select></div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <Button type="submit" disabled={saving} className="sm:col-span-2"><Plus data-icon="inline-start" />{saving ? "A guardar..." : "Adicionar produto"}</Button>
        </form>
        <section className="flex flex-col gap-3" aria-labelledby="support-task-list-title"><div className="flex items-center gap-2"><ClipboardList className="size-4 text-muted-foreground" /><h3 id="support-task-list-title" className="text-sm font-semibold">Lista de tarefas</h3></div>{tasks.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum registo de suporte.</p> : <div className="flex max-w-full gap-3 overflow-x-auto pb-2">{tasks.map((task) => <article key={task.id} className={`flex min-w-[260px] shrink-0 flex-col gap-3 rounded-xl border p-4 transition-colors ${task.completed ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-background"}`}><div><p className="font-semibold">{task.product}</p><p className="text-sm opacity-75">Saco: {task.bagMeasure}</p></div><div className="grid gap-1 text-sm"><p><span className="opacity-70">A colar:</span> {task.quantityToLabel}</p><p><span className="opacity-70">Já colada:</span> {task.quantityLabeled}</p><p><span className="opacity-70">Operador:</span> {task.operatorName}</p></div><div className="flex items-center justify-between gap-2"><Button type="button" size="sm" variant={task.completed ? "secondary" : "outline"} onClick={() => void toggleCompleted(task)} className="gap-2"><Check data-icon="inline-start" />{task.completed ? "Concluída" : "Validar"}</Button><Badge variant={task.completed ? "default" : "secondary"} className={task.completed ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}>{task.completed ? "Concluída" : "Pendente"}</Badge></div></article>)}</div>}</section>
      </div>
    </DialogContent>
  </Dialog>
}
