"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { ArrowDownToLine, ArrowUpFromLine, Check, FileSpreadsheet, PackagePlus, Pencil, RotateCcw, Search, Send, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { loadFinishedProducts, loadMaterialRequests, loadStockItems, saveFinishedProducts, saveMaterialRequests, saveStockItems } from "@/lib/storage"
import type { FinishedProduct, MaterialRequest, MaterialRequestStatus, StockCategory, StockItem } from "@/lib/types"

const statusLabels: Record<MaterialRequestStatus, string> = { requested: "Solicitada", approved: "Aprovada", transferred: "Na fase intermédia", in_production: "Em produção", returned_pending: "Devolução pendente", returned: "Devolvida" }
const dateTime = (value?: string) => value ? new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "—"

export function StockManagement() {
  const [items, setItems] = useState<StockItem[]>([])
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([])
  const [finishedForm, setFinishedForm] = useState({ palletNumber: "", product: "", quantity: "", unit: "un", lot: "", expiryDate: "", productionDate: "", channel: "HQ" as "HQ" | "B2B" })
  const [category, setCategory] = useState<StockCategory | "all">("all")
  const [transfer, setTransfer] = useState<{ id: string; source: "stock" | "request"; destination: "intermediate" | "production" | "warehouse"; quantity: string } | null>(null)
  const [form, setForm] = useState({ name: "", internalCode: "MP", category: "raw_material" as StockCategory, unit: "kg", quantity: "", lot: "", expiryDate: "" })
  const [requestItemId, setRequestItemId] = useState("")
  const [requestQuantity, setRequestQuantity] = useState("")
  const [planningUrl, setPlanningUrl] = useState("")
  const [planningRows, setPlanningRows] = useState<Array<{ code: string; name: string; quantity: number; unit: string; available: number; deficit: number }>>([])
  const [planningLoading, setPlanningLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [returnQty, setReturnQty] = useState<Record<string, string>>({})
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editStockForm, setEditStockForm] = useState({ name: "", internalCode: "", category: "raw_material" as StockCategory, unit: "", quantity: "", lot: "", expiryDate: "" })
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([])
  const [finishedSearch, setFinishedSearch] = useState("")
  const [finishedView, setFinishedView] = useState<"all" | "productionDate" | "lot" | "createdAt">("all")
  const [editingFinishedId, setEditingFinishedId] = useState<string | null>(null)
  const [editFinishedForm, setEditFinishedForm] = useState({ palletNumber: "", product: "", quantity: "", unit: "un", lot: "", expiryDate: "", productionDate: "", channel: "HQ" as "HQ" | "B2B" })

  useEffect(() => { Promise.all([loadStockItems(), loadMaterialRequests(), loadFinishedProducts()]).then(([loadedItems, loadedRequests, loadedFinishedProducts]) => { setItems(loadedItems); setRequests(loadedRequests); setFinishedProducts(loadedFinishedProducts) }) }, [])
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => (category === "all" || item.category === category) && (!term || item.name.toLowerCase().includes(term) || item.internalCode.toLowerCase().includes(term) || item.lot.toLowerCase().includes(term)))
  }, [items, category, search])
  const visibleFinished = useMemo(() => {
    const term = finishedSearch.trim().toLowerCase()
    const filtered = finishedProducts.filter((item) => !term || [item.product, item.palletNumber, item.lot].some((field) => (field ?? "").toLowerCase().includes(term)))
    const sorted = [...filtered]
    if (finishedView === "productionDate") sorted.sort((a, b) => (b.productionDate ?? "").localeCompare(a.productionDate ?? ""))
    else if (finishedView === "lot") sorted.sort((a, b) => (a.lot ?? "").localeCompare(b.lot ?? ""))
    else if (finishedView === "createdAt") sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    return sorted
  }, [finishedProducts, finishedSearch, finishedView])
  const updateItems = async (next: StockItem[]) => { setItems(next); await saveStockItems(next) }
  const updateRequests = async (next: MaterialRequest[]) => { setRequests(next); await saveMaterialRequests(next) }

  function startEditFinished(item: FinishedProduct) {
    setEditingFinishedId(item.id)
    setEditFinishedForm({ palletNumber: item.palletNumber, product: item.product, quantity: String(item.quantity), unit: item.unit, lot: item.lot, expiryDate: item.expiryDate, productionDate: item.productionDate, channel: item.channel })
  }

  async function saveEditFinished() {
    const quantity = Number(editFinishedForm.quantity)
    if (!editingFinishedId || !editFinishedForm.palletNumber.trim() || !editFinishedForm.product.trim() || !editFinishedForm.lot.trim() || !editFinishedForm.expiryDate || !editFinishedForm.productionDate || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Preencha a palete, produto, quantidade, lote, validade e dia de produção."); return }
    const next = finishedProducts.map((item) => item.id === editingFinishedId ? { ...item, palletNumber: editFinishedForm.palletNumber.trim(), product: editFinishedForm.product.trim(), quantity, unit: editFinishedForm.unit.trim() || "un", lot: editFinishedForm.lot.trim(), expiryDate: editFinishedForm.expiryDate, productionDate: editFinishedForm.productionDate, channel: editFinishedForm.channel } : item)
    setFinishedProducts(next); await saveFinishedProducts(next); setEditingFinishedId(null); toast.success("Produto acabado atualizado.")
  }

  async function addItem() {
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !form.lot.trim() || !form.expiryDate || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Preencha o material, lote, validade e uma quantidade válida."); return }
    const item: StockItem = { id: `stock_${Date.now()}`, name: form.name.trim(), internalCode: form.internalCode, category: form.category, unit: form.unit.trim() || "un", quantity, lot: form.lot.trim(), expiryDate: form.expiryDate, createdAt: new Date().toISOString() }
    await updateItems([...items, item]); setForm({ ...form, name: "", quantity: "", lot: "", expiryDate: "" }); toast.success("Material adicionado ao stock.")
  }

  async function addFinishedProduct() {
    const quantity = Number(finishedForm.quantity)
    if (!finishedForm.palletNumber.trim() || !finishedForm.product.trim() || !finishedForm.lot.trim() || !finishedForm.expiryDate || !finishedForm.productionDate || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Preencha a palete, produto, quantidade, lote, validade e dia de produção."); return }
    const product: FinishedProduct = { id: `finished_${Date.now()}`, palletNumber: finishedForm.palletNumber.trim(), product: finishedForm.product.trim(), quantity, unit: finishedForm.unit.trim() || "un", lot: finishedForm.lot.trim(), expiryDate: finishedForm.expiryDate, productionDate: finishedForm.productionDate, channel: finishedForm.channel, createdAt: new Date().toISOString() }
    const next = [product, ...finishedProducts]
    setFinishedProducts(next); await saveFinishedProducts(next)
    setFinishedForm({ ...finishedForm, palletNumber: "", product: "", quantity: "", lot: "", expiryDate: "", productionDate: "" }); toast.success("Produto acabado registado.")
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
      if (!request || !["approved", "transferred"].includes(request.status) || quantity > (request.intermediateQuantity ?? request.quantity)) { toast.error("Quantidade indisponível para transferência."); return }
      const now = new Date().toISOString()
      const isEnteringProduction = transfer.destination === "production"
      const stockItem = items.find((item) => item.id === request.stockItemId)
      const shouldConsumeStock = false
      if (shouldConsumeStock) {
        if (!stockItem || stockItem.quantity < quantity) { toast.error("Stock insuficiente para satisfazer esta requisição."); return }
        await updateItems(items.map((item) => item.id === request.stockItemId ? { ...item, quantity: item.quantity - quantity } : item))
      }
      await updateRequests(requests.map((entry) => entry.id === request.id ? { ...entry, status: isEnteringProduction ? "in_production" : "returned_pending", transferredAt: isEnteringProduction ? (entry.transferredAt ?? now) : entry.transferredAt, returnedQuantity: transfer.destination === "warehouse" ? quantity : entry.returnedQuantity, returnedAt: transfer.destination === "warehouse" ? now : entry.returnedAt, intermediateQuantity: (entry.intermediateQuantity ?? entry.quantity) - quantity } : entry))
      if (transfer.destination === "warehouse") { toast.info("Devolução enviada para aprovação do armazém.") }
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

  function startEditStock(item: StockItem) {
    setEditingStockId(item.id)
    setEditStockForm({ name: item.name, internalCode: item.internalCode, category: item.category, unit: item.unit, quantity: String(item.quantity), lot: item.lot, expiryDate: item.expiryDate })
  }

  async function saveEditStock() {
    const quantity = Number(editStockForm.quantity)
    if (!editingStockId || !editStockForm.name.trim() || !editStockForm.lot.trim() || !editStockForm.expiryDate || !Number.isFinite(quantity) || quantity < 0) { toast.error("Preencha o material, quantidade, lote e validade."); return }
    await updateItems(items.map((item) => item.id === editingStockId ? { ...item, name: editStockForm.name.trim(), internalCode: editStockForm.internalCode.trim(), category: editStockForm.category, unit: editStockForm.unit.trim() || "un", quantity, lot: editStockForm.lot.trim(), expiryDate: editStockForm.expiryDate } : item))
    setEditingStockId(null)
    toast.success("Linha de stock atualizada.")
  }

  async function mergeStock() {
    const selected = items.filter((item) => selectedStockIds.includes(item.id))
    if (selected.length < 2) { toast.error("Selecione pelo menos duas linhas do mesmo material para fazer merge."); return }
    const [first, ...rest] = selected
    const compatible = rest.every((item) => item.internalCode === first.internalCode && item.unit === first.unit)
    if (!compatible) { toast.error("O merge só pode juntar linhas com o mesmo código interno e unidade."); return }
    const lots = selected.flatMap((item) => item.lots?.length ? item.lots : [{ quantity: item.quantity, lot: item.lot, expiryDate: item.expiryDate }])
    const merged: StockItem = { ...first, quantity: selected.reduce((sum, item) => sum + item.quantity, 0), lot: lots.length > 1 ? "Vários lotes" : first.lot, expiryDate: lots.length > 1 ? "" : first.expiryDate, lots }
    await updateItems([merged, ...items.filter((item) => !selectedStockIds.includes(item.id))])
    setSelectedStockIds([])
    toast.success(`${selected.length} linhas agrupadas, mantendo os lotes e validades.`)
  }

  async function deleteItem(item: StockItem) {
    if (!window.confirm(`Eliminar "${item.name}" (${item.quantity} ${item.unit}) do stock atual?`)) return
    await updateItems(items.filter((entry) => entry.id !== item.id))
    toast.success("Material eliminado do stock.")
  }

  async function deleteRequest(id: string) {
    if (!window.confirm("Eliminar esta requisição?")) return
    const next = requests.filter((request) => request.id !== id)
    await updateRequests(next)
    toast.success("Requisição eliminada.")
  }

  async function deleteFinishedProduct(id: string) {
    if (!window.confirm("Eliminar este produto acabado?")) return
    const next = finishedProducts.filter((item) => item.id !== id)
    setFinishedProducts(next)
    await saveFinishedProducts(next)
    toast.success("Produto acabado eliminado.")
  }

  async function approveReturn(request: MaterialRequest) {
    const quantity = request.returnedQuantity ?? 0
    const now = new Date().toISOString()
    await updateItems(items.map((item) => item.id === request.stockItemId ? { ...item, quantity: item.quantity + quantity } : item))
    await updateRequests(requests.map((entry) => entry.id === request.id ? { ...entry, status: "returned", returnedAt: now } : entry))
    toast.success("Devolução aprovada e stock atualizado.")
  }

  async function changeStatus(request: MaterialRequest, status: MaterialRequestStatus) {
    if (status === "transferred") { setTransfer({ id: request.id, source: "request", destination: "production", quantity: String(request.intermediateQuantity ?? request.quantity) }); return }
    const now = new Date().toISOString()
    if (status === "approved") {
      const item = items.find((entry) => entry.id === request.stockItemId)
      if (!item || item.quantity < request.quantity) { toast.error("Stock insuficiente para aprovar esta requisição."); return }
      await updateItems(items.map((entry) => entry.id === request.stockItemId ? { ...entry, quantity: entry.quantity - request.quantity } : entry))
    }
    await updateRequests(requests.map((entry) => entry.id === request.id ? { ...entry, status, ...(status === "approved" ? { approvedAt: now } : {}) } : entry)); toast.success(`Requisição ${statusLabels[status].toLowerCase()}.`)
  }

  const transferForm = transfer && <Card className="border-primary/40"><CardContent className="flex flex-wrap items-end gap-3 p-4"><div className="flex flex-col gap-2"><Label>Destino</Label><Select value={transfer.destination} onValueChange={(value) => setTransfer({ ...transfer, destination: value as "intermediate" | "production" | "warehouse" })}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="intermediate">Fase intermédia</SelectItem><SelectItem value="production">Produção</SelectItem><SelectItem value="warehouse">Armazém (devolução)</SelectItem></SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Quantidade</Label><Input className="w-32" type="number" min="0" value={transfer.quantity} onChange={(event) => setTransfer({ ...transfer, quantity: event.target.value })} /></div><Button onClick={transferMaterial}><Send data-icon="inline-start" /> Confirmar transfer</Button><Button variant="ghost" onClick={() => setTransfer(null)}>Cancelar</Button></CardContent></Card>

  return <Tabs defaultValue="stock" className="flex flex-col gap-6">
    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4"><TabsTrigger value="stock">Stock de materiais ({items.length})</TabsTrigger><TabsTrigger value="requests" className={requests.some((request) => request.status === "requested") ? "animate-pulse border border-orange-500 text-orange-600" : ""}>Requisições ({requests.filter((request) => request.status !== "returned").length})</TabsTrigger><TabsTrigger value="production" className={requests.some((request) => request.status === "transferred") ? "animate-pulse border border-blue-500 text-blue-600" : ""}>Produção ({requests.filter((request) => ["transferred", "in_production"].includes(request.status)).length})</TabsTrigger><TabsTrigger value="finished">Produto acabado ({finishedProducts.length})</TabsTrigger></TabsList>
    <TabsContent value="stock" className="flex flex-col gap-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus /> Adicionar matéria-prima ou embalagem</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="flex flex-col gap-2"><Label>Material</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Açúcar" /></div><div className="flex flex-col gap-2"><Label htmlFor="internal-code">Código interno</Label><Input id="internal-code" value={form.internalCode} onChange={(event) => { const value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); setForm({ ...form, internalCode: value, category: value.startsWith("ME") ? "packaging" : "raw_material" }) }} placeholder="MP001 ou ME001" /><p className="text-xs text-muted-foreground">Use MP ou ME seguido do número.</p></div><div className="flex flex-col gap-2"><Label>Quantidade e unidade</Label><div className="flex gap-2"><Input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /><Input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="kg" /></div></div><div className="flex flex-col gap-2"><Label>Lote</Label><Input value={form.lot} onChange={(event) => setForm({ ...form, lot: event.target.value })} /></div><div className="flex flex-col gap-2"><Label>Validade</Label><Input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} /></div><div className="flex items-end"><Button onClick={addItem}>Adicionar ao stock</Button></div></CardContent></Card>
      <Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet /> Conferência do planeamento de produção</CardTitle></CardHeader><CardContent className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">Importe uma planilha Excel ou CSV através de um URL. O ficheiro é apenas lido e comparado com o stock atual.</p><div className="flex flex-col gap-2 sm:flex-row"><Input value={planningUrl} onChange={(event) => setPlanningUrl(event.target.value)} placeholder="https://empresa.pt/planeamento.xlsx" aria-label="URL da planilha de planeamento" /><Button onClick={importPlanning} disabled={planningLoading}>{planningLoading ? "A importar..." : "Importar e conferir"}</Button></div>{planningRows.length > 0 && <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-left"><th className="p-2">Código</th><th className="p-2">Material</th><th className="p-2">Necessário</th><th className="p-2">Disponível</th><th className="p-2">Estado</th></tr></thead><tbody>{planningRows.map((row, index) => <tr key={`${row.code}-${row.name}-${index}`} className="border-b last:border-0"><td className="p-2">{row.code || "—"}</td><td className="p-2">{row.name || "—"}</td><td className="p-2">{row.quantity} {row.unit}</td><td className="p-2">{row.available} {row.unit}</td><td className="p-2"><Badge variant={row.deficit > 0 ? "destructive" : "secondary"}>{row.deficit > 0 ? `Falta ${row.deficit} ${row.unit}` : "Disponível"}</Badge></td></tr>)}</tbody></table></div>}</CardContent></Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Stock atual</h2><div className="flex flex-1 flex-wrap items-center justify-end gap-3"><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por artigo, código ou lote" className="pl-8" aria-label="Pesquisar material no stock" /></div><Select value={category} onValueChange={(value) => setCategory(value as StockCategory | "all")}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os materiais</SelectItem><SelectItem value="raw_material">Matérias-primas</SelectItem><SelectItem value="packaging">Embalagens</SelectItem></SelectContent></Select></div></div>{transfer?.source === "stock" && transferForm}<div className="flex flex-col divide-y rounded-md border">{visibleItems.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum material encontrado.</p>}{visibleItems.map((item) => editingStockId === item.id ? <div key={item.id} className="grid gap-3 border-l-2 border-primary p-3 sm:grid-cols-2 lg:grid-cols-6"><Input aria-label="Material" value={editStockForm.name} onChange={(event) => setEditStockForm({ ...editStockForm, name: event.target.value })} /><Input aria-label="Código interno" value={editStockForm.internalCode} onChange={(event) => setEditStockForm({ ...editStockForm, internalCode: event.target.value })} /><Input aria-label="Quantidade" type="number" min="0" value={editStockForm.quantity} onChange={(event) => setEditStockForm({ ...editStockForm, quantity: event.target.value })} /><Input aria-label="Unidade" value={editStockForm.unit} onChange={(event) => setEditStockForm({ ...editStockForm, unit: event.target.value })} /><Input aria-label="Lote" value={editStockForm.lot} onChange={(event) => setEditStockForm({ ...editStockForm, lot: event.target.value })} /><div className="flex gap-2"><Input aria-label="Validade" type="date" value={editStockForm.expiryDate} onChange={(event) => setEditStockForm({ ...editStockForm, expiryDate: event.target.value })} /><Button size="icon" onClick={() => void saveEditStock()} aria-label="Guardar stock"><Check /></Button><Button size="icon" variant="ghost" onClick={() => setEditingStockId(null)} aria-label="Cancelar edição"><X /></Button></div></div> : <div key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3"><div className="flex items-center gap-2"><input type="checkbox" aria-label={`Selecionar ${item.name}`} checked={selectedStockIds.includes(item.id)} onChange={(event) => setSelectedStockIds(event.target.checked ? [...selectedStockIds, item.id] : selectedStockIds.filter((id) => id !== item.id))} /><div className="flex min-w-0 flex-1 items-center gap-2"><strong className="truncate">{item.name}</strong><Badge variant="outline">{item.internalCode}</Badge><Badge variant="secondary">{item.category === "raw_material" ? "MP" : "ME"}</Badge></div></div><span className="font-semibold tabular-nums">{item.quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></span><span className="text-sm text-muted-foreground">{item.lots?.length ? `${item.lots.length} lotes · ${item.lots.map((lot) => `${lot.lot} (${new Date(lot.expiryDate).toLocaleDateString("pt-PT")})`).join(", ")}` : `Lote ${item.lot} · Validade ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("pt-PT") : "—"}`}</span><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => startEditStock(item)} aria-label={`Editar ${item.name}`} title="Editar"><Pencil /></Button><Button size="icon" variant="ghost" onClick={() => setTransfer({ id: item.id, source: "stock", destination: "intermediate", quantity: String(item.quantity) })} aria-label={`Transferir ${item.name}`} title="Transferir"><ArrowUpFromLine /></Button><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" aria-label={`Eliminar ${item.name} do stock`} onClick={() => void deleteItem(item)}><Trash2 data-icon="inline-start" /> Eliminar</Button></div></div>)}</div>
      <div className="flex justify-end border-t pt-4"><Button variant="outline" onClick={() => void mergeStock()} disabled={selectedStockIds.length < 2}><PackagePlus data-icon="inline-start" />Fazer merge das linhas selecionadas ({selectedStockIds.length})</Button></div>
    </TabsContent>
    <TabsContent value="requests" className="flex flex-col gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpFromLine /> Nova requisição para produção</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="flex flex-1 flex-col gap-2"><Label>Material</Label><Select value={requestItemId} onValueChange={setRequestItemId}><SelectTrigger><SelectValue placeholder="Escolha o material" /></SelectTrigger><SelectContent>{items.filter((item) => item.quantity > 0).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Quantidade</Label><Input className="w-32" type="number" min="0" value={requestQuantity} onChange={(event) => setRequestQuantity(event.target.value)} /></div><Button onClick={createRequest}>Criar requisição</Button></CardContent></Card>{transfer?.source === "request" && transferForm}<div className="flex flex-col gap-3">{requests.filter((request) => !["returned", "in_production"].includes(request.status)).map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">{request.quantity} {request.unit} · Operador: {request.requester}</p><p className="text-xs text-muted-foreground">Movimentação: {dateTime(request.transferredAt ?? request.approvedAt ?? request.requestedAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge>{statusLabels[request.status]}</Badge><Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Eliminar requisição de ${request.materialName}`} onClick={() => void deleteRequest(request.id)}><Trash2 className="size-4" /></Button>{request.status === "requested" && <Button size="sm" onClick={() => changeStatus(request, "approved")}>Aprovar</Button>}{request.status === "approved" && <Button size="sm" variant="outline" onClick={() => changeStatus(request, "transferred")}>Transferir para produção</Button>}{request.status === "returned_pending" && <Button size="sm" onClick={() => void approveReturn(request)}>Aprovar devolução</Button>}{request.status === "approved" && <Button size="sm" onClick={() => changeStatus(request, "transferred")}><ArrowDownToLine data-icon="inline-start" /> Transfer</Button>}</div></CardContent></Card>)}</div></TabsContent>
    <TabsContent value="production" className="flex flex-col gap-6"><p className="text-sm text-muted-foreground">Materiais que saíram do armazém e estão na fase intermédia ou já foram requisitados pela produção.</p>{transfer?.source === "request" && transferForm}<div className="flex flex-col gap-3">{requests.filter((request) => ["transferred", "in_production"].includes(request.status)).map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">{request.intermediateQuantity ?? request.quantity} {request.unit} · Sala: {request.destinationRoom ?? request.requester}</p><p className="text-xs text-muted-foreground">Transferido em {dateTime(request.transferredAt)}</p></div><div className="flex flex-wrap items-end gap-2"><div className="flex flex-col gap-1"><Label className="text-xs" htmlFor={`ret-${request.id}`}>Qtd. a devolver</Label><Input id={`ret-${request.id}`} className="w-28" type="number" min="0" max={request.intermediateQuantity ?? request.quantity} value={returnQty[request.id] ?? String(request.intermediateQuantity ?? request.quantity)} onChange={(event) => setReturnQty({ ...returnQty, [request.id]: event.target.value })} /></div><Button size="sm" variant="outline" onClick={() => setTransfer({ id: request.id, source: "request", destination: "warehouse", quantity: returnQty[request.id] ?? String(request.intermediateQuantity ?? request.quantity) })}><RotateCcw data-icon="inline-start" /> Pedir devolução</Button><Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Eliminar material ${request.materialName}`} onClick={() => void deleteRequest(request.id)}><Trash2 className="size-4" /></Button></div></CardContent></Card>)}{requests.filter((request) => ["transferred", "in_production"].includes(request.status)).length === 0 && <p className="text-sm text-muted-foreground">Não existem materiais em produção.</p>}</div></TabsContent>
    <TabsContent value="finished" className="flex flex-col gap-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Produtos acabados ({finishedProducts.length})</h2><div className="flex flex-1 flex-wrap items-center justify-end gap-3"><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={finishedSearch} onChange={(event) => setFinishedSearch(event.target.value)} placeholder="Pesquisar por produto, palete ou lote" className="pl-8" aria-label="Pesquisar produto acabado" /></div><Select value={finishedView} onValueChange={(value) => setFinishedView(value as "all" | "productionDate" | "lot" | "createdAt")}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tudo</SelectItem><SelectItem value="productionDate">Por data de produção</SelectItem><SelectItem value="lot">Por lote</SelectItem><SelectItem value="createdAt">Por data de registo</SelectItem></SelectContent></Select></div></div><div className="overflow-x-auto"><div className="min-w-[1040px] divide-y rounded-md border"><div className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr_1fr_1fr_0.9fr_auto] gap-3 bg-muted/50 px-4 py-3 text-sm font-medium"><span>Produto / palete</span><span>Quantidade</span><span>Canal</span><span>Lote</span><span>Validade</span><span>Data produção</span><span>Registo</span><span className="text-right">Ações</span></div>{visibleFinished.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhum produto acabado encontrado.</p> : visibleFinished.map((item) => editingFinishedId === item.id ? <div key={item.id} className="grid gap-3 border-l-2 border-primary px-4 py-4 sm:grid-cols-2 lg:grid-cols-4"><div className="flex flex-col gap-1.5"><Label className="text-xs">Produto</Label><Input value={editFinishedForm.product} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, product: event.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Nº da palete</Label><Input value={editFinishedForm.palletNumber} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, palletNumber: event.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Quantidade e unidade</Label><div className="flex gap-2"><Input type="number" min="0" value={editFinishedForm.quantity} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, quantity: event.target.value })} /><Input className="w-20" value={editFinishedForm.unit} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, unit: event.target.value })} /></div></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Lote</Label><Input value={editFinishedForm.lot} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, lot: event.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Validade</Label><Input type="date" value={editFinishedForm.expiryDate} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, expiryDate: event.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Data de produção</Label><Input type="date" value={editFinishedForm.productionDate} onChange={(event) => setEditFinishedForm({ ...editFinishedForm, productionDate: event.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Destino</Label><Select value={editFinishedForm.channel} onValueChange={(value) => setEditFinishedForm({ ...editFinishedForm, channel: value as "HQ" | "B2B" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HQ">HQ</SelectItem><SelectItem value="B2B">B2B</SelectItem></SelectContent></Select></div><div className="flex items-end gap-2"><Button size="sm" onClick={() => void saveEditFinished()}><Check data-icon="inline-start" />Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingFinishedId(null)}><X data-icon="inline-start" />Cancelar</Button></div></div> : <div key={item.id} className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr_1fr_1fr_0.9fr_auto] items-center gap-3 px-4 py-3 text-sm"><div className="min-w-0"><p className="truncate font-semibold">{item.product}</p><p className="text-muted-foreground">Palete {item.palletNumber}</p></div><span className="tabular-nums">{item.quantity} {item.unit}</span><Badge variant={item.channel === "B2B" ? "default" : "secondary"}>{item.channel}</Badge><span>{item.lot}</span><span>{new Date(item.expiryDate).toLocaleDateString("pt-PT")}</span><span>{new Date(item.productionDate).toLocaleDateString("pt-PT")}</span><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-PT")}</span><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${item.product}`} onClick={() => startEditFinished(item)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Eliminar produto acabado ${item.product}`} onClick={() => void deleteFinishedProduct(item.id)}><Trash2 className="size-4" /></Button></div></div>)}</div></div><Card><CardHeader><CardTitle>Registar produto acabado</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="flex flex-col gap-2"><Label>Número da palete</Label><Input value={finishedForm.palletNumber} onChange={(event) => setFinishedForm({ ...finishedForm, palletNumber: event.target.value })} placeholder="PAL-0001" /></div><div className="flex flex-col gap-2"><Label>Produto</Label><Input value={finishedForm.product} onChange={(event) => setFinishedForm({ ...finishedForm, product: event.target.value })} placeholder="Nome do produto" /></div><div className="flex flex-col gap-2"><Label>Quantidade e unidade</Label><div className="flex gap-2"><Input type="number" min="0" value={finishedForm.quantity} onChange={(event) => setFinishedForm({ ...finishedForm, quantity: event.target.value })} placeholder="0" /><Input value={finishedForm.unit} onChange={(event) => setFinishedForm({ ...finishedForm, unit: event.target.value })} placeholder="un" /></div></div><div className="flex flex-col gap-2"><Label>Lote</Label><Input value={finishedForm.lot} onChange={(event) => setFinishedForm({ ...finishedForm, lot: event.target.value })} /></div><div className="flex flex-col gap-2"><Label>Validade</Label><Input type="date" value={finishedForm.expiryDate} onChange={(event) => setFinishedForm({ ...finishedForm, expiryDate: event.target.value })} /></div><div className="flex flex-col gap-2"><Label>Dia de produção</Label><Input type="date" value={finishedForm.productionDate} onChange={(event) => setFinishedForm({ ...finishedForm, productionDate: event.target.value })} /></div><div className="flex flex-col gap-2"><Label>Destino</Label><Select value={finishedForm.channel} onValueChange={(value) => setFinishedForm({ ...finishedForm, channel: value as "HQ" | "B2B" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HQ">HQ</SelectItem><SelectItem value="B2B">B2B</SelectItem></SelectContent></Select></div><div className="flex items-end"><Button onClick={addFinishedProduct}>Registar produto</Button></div></CardContent></Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{finishedProducts.map((product) => <Card key={product.id}><CardContent className="flex flex-col gap-3 p-4"><div className="flex items-center justify-between gap-2"><strong className="truncate">{product.product}</strong><Badge variant="outline">{product.channel}</Badge></div><p className="text-sm text-muted-foreground">Palete {product.palletNumber} · Lote {product.lot}</p><p className="text-2xl font-semibold">{product.quantity} <span className="text-sm font-normal text-muted-foreground">{product.unit}</span></p><p className="text-xs text-muted-foreground">Produção: {new Date(product.productionDate).toLocaleDateString("pt-PT")} · Validade: {new Date(product.expiryDate).toLocaleDateString("pt-PT")}</p></CardContent></Card>)}{finishedProducts.length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem produtos acabados registados.</p>}</div></TabsContent>
  </Tabs>
}
