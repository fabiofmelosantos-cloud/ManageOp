"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownToLine, ArrowUpFromLine, PackagePlus, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  loadMaterialRequests, loadStockItems, saveMaterialRequests, saveStockItems,
} from "@/lib/storage"
import type { MaterialRequest, MaterialRequestStatus, StockCategory, StockItem } from "@/lib/types"

const statusLabels: Record<MaterialRequestStatus, string> = { requested: "Solicitada", approved: "Aprovada", transferred: "Transferida", returned: "Devolvida" }

export function StockManagement() {
  const [items, setItems] = useState<StockItem[]>([])
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [category, setCategory] = useState<StockCategory | "all">("all")
  const [form, setForm] = useState({ name: "", internalCode: "MP" as "MP" | "ME", category: "raw_material" as StockCategory, unit: "kg", quantity: "", lot: "", expiryDate: "" })
  const [requestItemId, setRequestItemId] = useState("")
  const [requestQuantity, setRequestQuantity] = useState("")

  useEffect(() => { Promise.all([loadStockItems(), loadMaterialRequests()]).then(([loadedItems, loadedRequests]) => { setItems(loadedItems); setRequests(loadedRequests) }) }, [])

  const visibleItems = useMemo(() => category === "all" ? items : items.filter((item) => item.category === category), [items, category])
  const updateItems = async (next: StockItem[]) => { setItems(next); await saveStockItems(next) }
  const updateRequests = async (next: MaterialRequest[]) => { setRequests(next); await saveMaterialRequests(next) }

  async function addItem() {
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !form.lot.trim() || !form.expiryDate || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Preencha o material, lote, validade e uma quantidade válida."); return }
    const item: StockItem = { id: `stock_${Date.now()}`, name: form.name.trim(), internalCode: form.internalCode, category: form.category, unit: form.unit.trim() || "un", quantity, lot: form.lot.trim(), expiryDate: form.expiryDate, createdAt: new Date().toISOString() }
    await updateItems([...items, item]); setForm({ name: "", internalCode: form.internalCode, category: form.category, unit: form.unit, quantity: "", lot: "", expiryDate: "" }); toast.success("Material adicionado ao stock.")
  }

  async function createRequest() {
    const item = items.find((candidate) => candidate.id === requestItemId)
    const quantity = Number(requestQuantity)
    if (!item || !Number.isFinite(quantity) || quantity <= 0 || quantity > item.quantity) { toast.error("Selecione um material e uma quantidade disponível."); return }
    const request: MaterialRequest = { id: `request_${Date.now()}`, stockItemId: item.id, materialName: item.name, quantity, unit: item.unit, requester: "Utilizador autorizado", status: "requested", requestedAt: new Date().toISOString() }
    await updateRequests([...requests, request]); setRequestItemId(""); setRequestQuantity(""); toast.success("Requisição criada.")
  }

  async function changeStatus(request: MaterialRequest, status: MaterialRequestStatus) {
    const now = new Date().toISOString()
    if (status === "transferred") {
      const source = items.find((item) => item.id === request.stockItemId)
      if (!source || source.quantity < request.quantity) { toast.error("Stock insuficiente para transferir este material."); return }
      await updateItems(items.map((item) => item.id === request.stockItemId ? { ...item, quantity: item.quantity - request.quantity } : item))
    }
    const updated = requests.map((entry) => entry.id === request.id ? { ...entry, status, ...(status === "approved" ? { approvedAt: now } : {}), ...(status === "transferred" ? { transferredAt: now, intermediateQuantity: request.quantity } : {}) } : entry)
    await updateRequests(updated); toast.success(status === "transferred" ? "Material transferido para a fase intermédia e removido do stock." : `Requisição ${statusLabels[status].toLowerCase()}.`)
  }

  async function returnMaterial(request: MaterialRequest) {
    const returned = Number(window.prompt(`Quantidade a devolver (máx. ${request.quantity} ${request.unit})`, String(request.quantity)))
    if (!Number.isFinite(returned) || returned <= 0 || returned > request.quantity) return
    const nextItems = items.map((item) => item.id === request.stockItemId ? { ...item, quantity: item.quantity + returned } : item)
    const nextRequests = requests.map((entry) => entry.id === request.id ? { ...entry, status: "returned" as const, returnedQuantity: returned, returnedAt: new Date().toISOString() } : entry)
    await updateItems(nextItems); await updateRequests(nextRequests); toast.success("Devolução registada e stock atualizado.")
  }

  return <Tabs defaultValue="stock" className="flex flex-col gap-6">
    <TabsList><TabsTrigger value="stock">Stock de materiais</TabsTrigger><TabsTrigger value="requests">Requisições ({requests.length})</TabsTrigger></TabsList>
    <TabsContent value="stock" className="flex flex-col gap-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus /> Adicionar matéria-prima ou embalagem</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2"><Label>Material</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Açúcar" /></div>
        <div className="flex flex-col gap-2"><Label>Código interno</Label><Select value={form.internalCode} onValueChange={(value) => setForm({ ...form, internalCode: value as "MP" | "ME", category: value === "MP" ? "raw_material" : "packaging" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MP">MP · Matéria-prima</SelectItem><SelectItem value="ME">ME · Material de embalagem</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-2"><Label>Quantidade e unidade</Label><div className="flex gap-2"><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" /><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" /></div></div>
        <div className="flex flex-col gap-2"><Label>Lote</Label><Input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} /></div>
        <div className="flex flex-col gap-2"><Label>Validade</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
        <div className="flex items-end"><Button onClick={addItem}>Adicionar ao stock</Button></div>
      </CardContent></Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Stock atual</h2><Select value={category} onValueChange={(value) => setCategory(value as StockCategory | "all")}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os materiais</SelectItem><SelectItem value="raw_material">Matérias-primas</SelectItem><SelectItem value="packaging">Embalagens</SelectItem></SelectContent></Select></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-2 p-4"><div className="flex justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><strong className="truncate">{item.name}</strong><Badge variant="outline">{item.internalCode ?? (item.category === "raw_material" ? "MP" : "ME")}</Badge></div><Badge variant="secondary">{item.category === "raw_material" ? "Matéria-prima" : "Embalagem"}</Badge></div><p className="text-2xl font-semibold">{item.quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p><p className="text-sm text-muted-foreground">Lote {item.lot} · Validade {new Date(item.expiryDate).toLocaleDateString("pt-PT")}</p></CardContent></Card>)}{visibleItems.length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem materiais nesta categoria.</p>}</div>
    </TabsContent>
    <TabsContent value="requests" className="flex flex-col gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpFromLine /> Nova requisição para produção</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="flex flex-1 flex-col gap-2"><Label>Material</Label><Select value={requestItemId} onValueChange={setRequestItemId}><SelectTrigger><SelectValue placeholder="Escolha o material" /></SelectTrigger><SelectContent>{items.filter((item) => item.quantity > 0).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Quantidade</Label><Input className="w-32" type="number" min="0" value={requestQuantity} onChange={(e) => setRequestQuantity(e.target.value)} /></div><Button onClick={createRequest}>Criar requisição</Button></CardContent></Card>
      <div className="flex flex-col gap-3">{requests.map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">{request.quantity} {request.unit} · {request.requester}</p>{request.status === "transferred" && <p className="text-xs text-muted-foreground">Na fase intermédia · disponível para levantamento pela produção</p>}</div><div className="flex flex-wrap items-center gap-2"><Badge>{statusLabels[request.status]}</Badge>{request.status === "requested" && <Button size="sm" onClick={() => changeStatus(request, "approved")}>Aprovar</Button>}{request.status === "approved" && <Button size="sm" onClick={() => changeStatus(request, "transferred")}><ArrowDownToLine data-icon="inline-start" /> Transferir</Button>}{request.status === "transferred" && <Button size="sm" variant="outline" onClick={() => returnMaterial(request)}><RotateCcw data-icon="inline-start" /> Registar devolução</Button>}</div></CardContent></Card>)}{requests.length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem requisições.</p>}</div>
    </TabsContent>
  </Tabs>
}
