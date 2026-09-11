"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, PackagePlus, RotateCcw, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { loadMaterialRequests, loadStockItems, saveMaterialRequests, saveStockItems } from "@/lib/storage"
import type { MaterialRequest, MaterialRequestStatus, StockCategory, StockItem } from "@/lib/types"

const statusLabels: Record<MaterialRequestStatus, string> = { requested: "Solicitada", approved: "Aprovada", transferred: "Na fase intermédia", in_production: "Em produção", returned: "Devolvida" }
const dateTime = (value?: string) => value ? new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "—"

export function StockManagement() {
  const [items, setItems] = useState<StockItem[]>([])
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [category, setCategory] = useState<StockCategory | "all">("all")
  const [transfer, setTransfer] = useState<{ id: string; source: "stock" | "request"; destination: "intermediate" | "production" | "warehouse"; quantity: string } | null>(null)
  const [form, setForm] = useState({ name: "", internalCode: "MP", category: "raw_material" as StockCategory, unit: "kg", quantity: "", lot: "", expiryDate: "" })
  const [requestItemId, setRequestItemId] = useState("")
  const [requestQuantity, setRequestQuantity] = useState("")
  const [planningUrl, setPlanningUrl] = useState("")
  const [planningRows, setPlanningRows] = useState<Array<{ code: string; name: string; quantity: number; unit: string; available: number; deficit: number }>>([])
  const [planningLoading, setPlanningLoading] = useState(false)

  useEffect(() => { Promise.all([loadStockItems(), loadMaterialRequests()]).then(([loadedItems, loadedRequests]) => { setItems(loadedItems); setRequests(loadedRequests) }) }, [])
  const visibleItems = useMemo(() => category === "all" ? items : items.filter((item) => item.category === category), [items, category])
  const updateItems = async (next: StockItem[]) => { setItems(next); await saveStockItems(next) }
  const updateRequests = async (next: MaterialRequest[]) => { setRequests(next); await saveMaterialRequests(next) }

  async function addItem() {
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !form.lot.trim() || !form.expiryDate || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Preencha o material, lote, validade e uma quantidade válida."); return }
    const item: StockItem = { id: `stock_${Date.now()}`, name: form.name.trim(), internalCode: form.internalCode, category: form.category, unit: form.unit.trim() || "un", quantity, lot: form.lot.trim(), expiryDate: form.expiryDate, createdAt: new Date().toISOString() }
    await updateItems([...items, item]); setForm({ ...form, name: "", quantity: "", lot: "", expiryDate: "" }); toast.success("Material adicionado ao stock.")
  }

  async function createRequest() {
    const item = items.find((candidate) => candidate.id === requestItemId); const quantity = Number(requestQuantity)
    if (!item || !Number.isFinite(quantity) || quantity <= 0 || quantity > item.quantity) { toast.error("Selecione um material e uma quantidade disponível."); return }
    const now = new Date().toISOString()
    const request: MaterialRequest = { id: `request_${Date.now()}`, stockItemId: item.id, materialName: item.name, quantity, unit: item.unit, requester: "Utilizador autorizado", status: "requested", requestedAt: now }
    await updateRequests([...requests, request]); setRequestItemId(""); setRequestQuantity(""); toast.success("Requisição criada.")
  }

  async function transferMaterial() {
    if (!transfer) return
    const quantity = Number(transfer.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) { toast.error("Indique uma quantidade válida."); return }
    if (transfer.source === "stock") {
      const item = items.find((entry) => entry.id === transfer.id)
      if (!item || item.quantity < quantity) { toast.error("Stock insuficiente."); return }
      const now = new Date().toISOString()
      const request: MaterialRequest = { id: `request_${Date.now()}`, stockItemId: item.id, materialName: item.name, quantity, unit: item.unit, requester: "Utilizador autorizado", status: transfer.destination === "production" ? "transferred" : "approved", requestedAt: now, approvedAt: now, ...(transfer.destination === "production" ? { transferredAt: now, intermediateQuantity: quantity } : {}) }
      await updateItems(items.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - quantity } : entry)); await updateRequests([...requests, request])
    } else {
      const request = requests.find((entry) => entry.id === transfer.id)
      if (!request || request.status !== "transferred" || quantity > (request.intermediateQuantity ?? request.quantity)) { toast.error("Quantidade indisponível na fase intermédia."); return }
      const now = new Date().toISOString()
      await updateRequests(requests.map((entry) => entry.id === request.id ? { ...entry, status: transfer.destination === "production" ? "in_production" : "returned", returnedQuantity: transfer.destination === "warehouse" ? quantity : entry.returnedQuantity, returnedAt: transfer.destination === "warehouse" ? now : entry.returnedAt, intermediateQuantity: (entry.intermediateQuantity ?? entry.quantity) - quantity } : entry))
      if (transfer.destination === "warehouse") { await updateItems(items.map((item) => item.id === request.stockItemId ? { ...item, quantity: item.quantity + quantity } : item)) }
    }
    setTransfer(null); toast.success("Transferência registada e stock atualizado.")
  }

  async function importPlanning() {
    let url: URL
    try { url = new URL(planningUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() } catch { toast.error('Indique um URL HTTP/HTTPS válido.'); return }
    setPlanningLoading(true)
    try {
      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Não foi possível ler a planilha.')
      const buffer = await response.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]] ?? {}, { defval: '' })
      const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase()
      const result = rows.map((row) => {
        const entries = Object.entries(row)
        const find = (names: string[]) => entries.find(([key]) => names.some((name) => normalized(key).includes(name)))?.[1]
        const code = String(find(['código', 'codigo', 'code']) ?? '')
        const name = String(find(['material', 'matéria', 'materia', 'nome']) ?? '')
        const quantity = Number(String(find(['quantidade', 'quantity', 'necess']) ?? '0').replace(',', '.')) || 0
        const unit = String(find(['unidade', 'unit']) ?? 'un')
        const available = items.filter((item) => item.internalCode.toLowerCase() === code.toLowerCase() || item.name.toLowerCase() === name.toLowerCase()).reduce((sum, item) => sum + item.quantity, 0)
        return { code, name, quantity, unit, available, deficit: Math.max(quantity - available, 0) }
      }).filter((row) => row.name || row.code)
      setPlanningRows(result); toast.success(`${result.length} materiais conferidos.`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao importar a planilha.') } finally { setPlanningLoading(false) }
  }

  async function changeStatus(request: MaterialRequest, status: MaterialRequestStatus) {
    if (status === "transferred") { setTransfer({ id: request.id, source: "request", destination: "production", quantity: String(request.quantity) }); return }
    const now = new Date().toISOString()
    await updateRequests(requests.map((entry) => entry.id === request.id ? { ...entry, status, ...(status === "approved" ? { approvedAt: now } : {}) } : entry)); toast.success(`Requisição ${statusLabels[status].toLowerCase()}.`)
  }

  const transferForm = transfer && <Card className="border-primary/40"><CardContent className="flex flex-wrap items-end gap-3 p-4"><div className="flex flex-col gap-2"><Label>Destino</Label><Select value={transfer.destination} onValueChange={(value) => setTransfer({ ...transfer, destination: value as "intermediate" | "production" | "warehouse" })}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="intermediate">Fase intermédia</SelectItem><SelectItem value="production">Produção</SelectItem><SelectItem value="warehouse">Armazém (devolução)</SelectItem></SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Quantidade</Label><Input className="w-32" type="number" min="0" value={transfer.quantity} onChange={(event) => setTransfer({ ...transfer, quantity: event.target.value })} /></div><Button onClick={transferMaterial}><Send data-icon="inline-start" /> Confirmar transfer</Button><Button variant="ghost" onClick={() => setTransfer(null)}>Cancelar</Button></CardContent></Card>

  return <Tabs defaultValue="stock" className="flex flex-col gap-6">
    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="stock">Stock de materiais ({items.length})</TabsTrigger><TabsTrigger value="requests">Requisições ({requests.filter((request) => request.status !== "returned").length})</TabsTrigger><TabsTrigger value="production">Produção ({requests.filter((request) => ["transferred", "in_production"].includes(request.status)).length})</TabsTrigger></TabsList>
    <TabsContent value="stock" className="flex flex-col gap-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus /> Adicionar matéria-prima ou embalagem</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="flex flex-col gap-2"><Label>Material</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Açúcar" /></div><div className="flex flex-col gap-2"><Label htmlFor="internal-code">Código interno</Label><Input id="internal-code" value={form.internalCode} onChange={(event) => { const value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); setForm({ ...form, internalCode: value, category: value.startsWith("ME") ? "packaging" : "raw_material" }) }} placeholder="MP001 ou ME001" /><p className="text-xs text-muted-foreground">Use MP ou ME seguido do número.</p></div><div className="flex flex-col gap-2"><Label>Quantidade e unidade</Label><div className="flex gap-2"><Input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /><Input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="kg" /></div></div><div className="flex flex-col gap-2"><Label>Lote</Label><Input value={form.lot} onChange={(event) => setForm({ ...form, lot: event.target.value })} /></div><div className="flex flex-col gap-2"><Label>Validade</Label><Input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} /></div><div className="flex items-end"><Button onClick={addItem}>Adicionar ao stock</Button></div></CardContent></Card>
      <Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet /> Conferência do planeamento de produção</CardTitle></CardHeader><CardContent className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">Importe uma planilha Excel ou CSV através de um URL. O ficheiro é apenas lido e comparado com o stock atual.</p><div className="flex flex-col gap-2 sm:flex-row"><Input value={planningUrl} onChange={(event) => setPlanningUrl(event.target.value)} placeholder="https://empresa.pt/planeamento.xlsx" aria-label="URL da planilha de planeamento" /><Button onClick={importPlanning} disabled={planningLoading}>{planningLoading ? "A importar..." : "Importar e conferir"}</Button></div>{planningRows.length > 0 && <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-left"><th className="p-2">Código</th><th className="p-2">Material</th><th className="p-2">Necessário</th><th className="p-2">Disponível</th><th className="p-2">Estado</th></tr></thead><tbody>{planningRows.map((row, index) => <tr key={`${row.code}-${row.name}-${index}`} className="border-b last:border-0"><td className="p-2">{row.code || "—"}</td><td className="p-2">{row.name || "—"}</td><td className="p-2">{row.quantity} {row.unit}</td><td className="p-2">{row.available} {row.unit}</td><td className="p-2"><Badge variant={row.deficit > 0 ? "destructive" : "secondary"}>{row.deficit > 0 ? `Falta ${row.deficit} ${row.unit}` : "Disponível"}</Badge></td></tr>)}</tbody></table></div>}</CardContent></Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Stock atual</h2><Select value={category} onValueChange={(value) => setCategory(value as StockCategory | "all")}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os materiais</SelectItem><SelectItem value="raw_material">Matérias-primas</SelectItem><SelectItem value="packaging">Embalagens</SelectItem></SelectContent></Select></div>{transfer?.source === "stock" && transferForm}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-3 p-4"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><strong className="truncate">{item.name}</strong><Badge variant="outline">{item.internalCode}</Badge></div><Badge variant="secondary">{item.category === "raw_material" ? "MP" : "ME"}</Badge></div><p className="text-2xl font-semibold">{item.quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p><p className="text-sm text-muted-foreground">Lote {item.lot} · Validade {new Date(item.expiryDate).toLocaleDateString("pt-PT")}</p><p className="text-xs text-muted-foreground">Disponível no armazém</p><Button size="sm" variant="outline" onClick={() => setTransfer({ id: item.id, source: "stock", destination: "intermediate", quantity: String(item.quantity) })}><ArrowUpFromLine data-icon="inline-start" /> Transfer</Button></CardContent></Card>)}</div>
    </TabsContent>
    <TabsContent value="requests" className="flex flex-col gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpFromLine /> Nova requisição para produção</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="flex flex-1 flex-col gap-2"><Label>Material</Label><Select value={requestItemId} onValueChange={setRequestItemId}><SelectTrigger><SelectValue placeholder="Escolha o material" /></SelectTrigger><SelectContent>{items.filter((item) => item.quantity > 0).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Quantidade</Label><Input className="w-32" type="number" min="0" value={requestQuantity} onChange={(event) => setRequestQuantity(event.target.value)} /></div><Button onClick={createRequest}>Criar requisição</Button></CardContent></Card>{transfer?.source === "request" && transferForm}<div className="flex flex-col gap-3">{requests.filter((request) => !["returned", "in_production"].includes(request.status)).map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">{request.quantity} {request.unit} · Operador: {request.requester}</p><p className="text-xs text-muted-foreground">Movimentação: {dateTime(request.transferredAt ?? request.approvedAt ?? request.requestedAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge>{statusLabels[request.status]}</Badge>{request.status === "requested" && <Button size="sm" onClick={() => changeStatus(request, "approved")}>Aprovar</Button>}{request.status === "approved" && <Button size="sm" onClick={() => changeStatus(request, "transferred")}><ArrowDownToLine data-icon="inline-start" /> Transfer</Button>}</div></CardContent></Card>)}</div></TabsContent>
    <TabsContent value="production" className="flex flex-col gap-6"><p className="text-sm text-muted-foreground">Materiais que saíram do armazém e estão na fase intermédia ou já foram requisitados pela produção.</p>{transfer?.source === "request" && transferForm}<div className="flex flex-col gap-3">{requests.filter((request) => request.status === "transferred").map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">{request.intermediateQuantity ?? request.quantity} {request.unit} · Operador: {request.requester}</p><p className="text-xs text-muted-foreground">Transferido em {dateTime(request.transferredAt)}</p></div><Button size="sm" variant="outline" onClick={() => setTransfer({ id: request.id, source: "request", destination: "warehouse", quantity: String(request.intermediateQuantity ?? request.quantity) })}><RotateCcw data-icon="inline-start" /> Transfer</Button></CardContent></Card>)}{requests.filter((request) => ["transferred", "in_production"].includes(request.status)).length === 0 && <p className="text-sm text-muted-foreground">Não existem materiais em produção.</p>}</div></TabsContent>
  </Tabs>
}
