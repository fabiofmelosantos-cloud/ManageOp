"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, ClipboardList, LifeBuoy, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabase } from "@/lib/supabase-client"
import { loadStockItems } from "@/lib/storage"
import type { StockItem } from "@/lib/types"

type Worker = { id: string; name: string; employee_id?: string }
type SupportTask = { id: string; product: string; bagMeasure: string; internalCode: string; quantityToLabel: number; quantityLabeled: number; operatorName: string; createdAt: string; completed?: boolean }
type FormState = { product: string; bagMeasure: string; internalCode: string; quantityToLabel: string }
type TaskUpdateState = { quantityLabeled: string; operatorId: string }

const emptyForm: FormState = { product: "", bagMeasure: "", internalCode: "", quantityToLabel: "" }

export function SupportCard({ fullPage = false }: { fullPage?: boolean }) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [packagingItems, setPackagingItems] = useState<StockItem[]>([])
  const [tasks, setTasks] = useState<SupportTask[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void Promise.all([
      fetch("/api/support-tasks").then((response) => response.json()).then(setTasks),
      getSupabase().from("workers").select("id, name, employee_id").order("name").then(({ data }) => setWorkers(data ?? [])),
      loadStockItems().then((items) => setPackagingItems(items.filter((item) => item.category === "packaging"))),
    ])
  }, [])

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const response = await fetch("/api/support-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantityToLabel: Number(form.quantityToLabel) }) })
    const result = await response.json()
    setSaving(false)
    if (!response.ok) return setError(result.error ?? "Não foi possível guardar o registro.")
    setTasks((current) => [result, ...current])
    setForm(emptyForm)
  }

  async function updateTask(task: SupportTask, update: TaskUpdateState) {
    const operator = workers.find((worker) => worker.id === update.operatorId)
    if (!operator || update.quantityLabeled === "") return setError("Preencha a quantidade colada e o operador.")
    const response = await fetch("/api/support-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, quantityLabeled: Number(update.quantityLabeled), operatorId: operator.id, operatorName: operator.name }) })
    if (!response.ok) return setError("Não foi possível atualizar a tarefa.")
    const updated = await response.json() as SupportTask
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  async function toggleCompleted(task: SupportTask) {
    const response = await fetch("/api/support-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed: !task.completed }) })
    if (!response.ok) return setError("Não foi possível validar a conclusão da tarefa.")
    const updated = await response.json() as SupportTask
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const content = <div className={fullPage ? "min-h-screen bg-background p-4 sm:p-8" : ""}>
    {fullPage && <div className="mx-auto mb-6 flex max-w-7xl items-center gap-3"><LifeBuoy className="size-8 text-primary" /><h1 className="text-3xl font-bold tracking-tight">SUPORTE</h1></div>}
    <div className={fullPage ? "mx-auto max-w-7xl" : ""}>
      <div className="flex flex-col gap-6">
        <form onSubmit={addTask} className="grid items-end gap-3 border-b pb-4 md:grid-cols-[1.3fr_1.4fr_1fr_1fr_auto]">
          <div className="grid gap-1.5"><Label htmlFor="support-product">Produto</Label><Input id="support-product" value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} required /></div>
          <div className="grid gap-1.5"><Label>Referência interna ME</Label><Select value={form.internalCode} onValueChange={(value) => { const item = packagingItems.find((entry) => entry.internalCode === value); setForm({ ...form, internalCode: value, bagMeasure: item?.unit ?? "", product: form.product || item?.name || "" }) }}><SelectTrigger><SelectValue placeholder="Selecionar embalagem" /></SelectTrigger><SelectContent>{packagingItems.map((item) => <SelectItem key={item.id} value={item.internalCode}>{item.internalCode} · {item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="support-measure">Medida do saco</Label><Input id="support-measure" placeholder="Preenchida pela ME" value={form.bagMeasure} readOnly required /></div>
          <div className="grid gap-1.5"><Label htmlFor="support-to-label">Quantidade a colar</Label><Input id="support-to-label" type="number" min="0" value={form.quantityToLabel} onChange={(event) => setForm({ ...form, quantityToLabel: event.target.value })} required /></div>
          <Button type="submit" disabled={saving}><Plus data-icon="inline-start" />{saving ? "A guardar..." : "Adicionar"}</Button>
          {error && <p className="text-sm text-destructive md:col-span-5" role="alert">{error}</p>}
        </form>
        <section className="flex flex-col gap-3" aria-labelledby="support-task-list-title">
          <div className="flex items-center gap-2"><ClipboardList className="size-4 text-muted-foreground" /><h2 id="support-task-list-title" className="text-sm font-semibold">Tarefas de suporte</h2></div>
          {tasks.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhum registo de suporte.</p> : <div className="overflow-x-auto"><div className="min-w-[1050px] overflow-hidden rounded-lg border"><div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1.4fr_auto] gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground"><span>Produto / ME</span><span>Medida do saco</span><span>A colar</span><span>Já colada</span><span>Operador / execução</span><span>Estado</span></div>{tasks.map((task) => <article key={task.id} className={`grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1.4fr_auto] items-center gap-3 border-t px-4 py-3 ${task.completed ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-background"}`}><div><p className="font-semibold">{task.product}</p><p className="text-xs opacity-70">ME: {task.internalCode}</p></div><p className="text-sm">{task.bagMeasure}</p><p className="text-sm">{task.quantityToLabel}</p><p className="text-sm">{task.quantityLabeled || "—"}</p>{task.completed ? <p className="text-sm">{task.operatorName || "—"}</p> : <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void updateTask(task, { quantityLabeled: String(data.get("quantityLabeled") ?? ""), operatorId: String(data.get("operatorId") ?? "") }) }}><Input className="w-20" name="quantityLabeled" type="number" min="0" placeholder="Qtd." required /><Select name="operatorId"><SelectTrigger className="w-36"><SelectValue placeholder="Operador" /></SelectTrigger><SelectContent>{workers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>)}</SelectContent></Select><Button type="submit" size="sm">Guardar</Button></form>}<div className="flex items-center gap-2"><Button type="button" size="sm" variant={task.completed ? "secondary" : "outline"} onClick={() => void toggleCompleted(task)} className="gap-2"><Check data-icon="inline-start" />{task.completed ? "Concluída" : "Validar"}</Button><Badge variant={task.completed ? "default" : "secondary"} className={task.completed ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}>{task.completed ? "Concluída" : "Pendente"}</Badge></div></article>)}</div></div>}
        </section>
      </div>
    </div>
  </div>

  if (fullPage) return content
  return <Link href="/support" className="block"><Card className="group aspect-square border-primary/20 transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"><CardContent className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center sm:p-3"><LifeBuoy className="size-8 text-primary" aria-hidden="true" /><CardTitle className="text-xs sm:text-sm">Suporte</CardTitle></CardContent></Card></Link>
}
