"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Factory, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loadMaterialRequests, saveMaterialRequests } from "@/lib/storage"
import type { MaterialRequest, Product } from "@/lib/types"
import { QualityEnvelope } from "@/components/production/quality-envelope"

const initial = { productName: "", productionLot: "", productionDate: "", productionExpiry: "", requestProductionDate: "", dailyQuantity: "", totalToProduce: "", palletQuantity: "", palletNumber: "", channel: "HQ", wasteMp: "0", mpSurplus: "0", wasteMe: "0", bagsInRoom: "", bagKg: "", lowerValueBags: "", lot: "", expiry: "", requestedQuantity: "", operators: "1", startedAt: "" }
type Pallet = { id: string; quantity: number; number: string; lot: string; expiry: string; channel: string; createdAt: string }
type ProductionState = typeof initial & { tubs: number; pallets: Pallet[]; closedAt?: string }

export default function HonetopProductionPage() {
  const [form, setForm] = useState(initial)
  const [tubs, setTubs] = useState(0)
  const [pallets, setPallets] = useState<Pallet[]>([])
  const [history, setHistory] = useState<ProductionState[]>([])
  const [message, setMessage] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [requesting, setRequesting] = useState(false)
  const [roomRequests, setRoomRequests] = useState<MaterialRequest[]>([])
  const [consume, setConsume] = useState<Record<string, string>>({})
  const [mpPallets, setMpPallets] = useState<Array<{ id: string; bags: number; lowerValueBags: number; lot: string; expiry: string; closedAt: string }>>([])
  const [mpForm, setMpForm] = useState({ bags: "", lowerValueBags: "", lot: "", expiry: "" })
  const mpSet = (field: keyof typeof mpForm, value: string) => setMpForm((current) => ({ ...current, [field]: value }))
  const mpFullBags = Number(mpForm.bags || 0)
  const mpLowerKg = Number(mpForm.lowerValueBags || 0)
  const mpTotalKg = mpFullBags * 25 + mpLowerKg
  const [editingMpId, setEditingMpId] = useState<string | null>(null)
  const deleteMpPallet = async (id: string) => { const next = mpPallets.filter((pallet) => pallet.id !== id); setMpPallets(next); await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_mp_pallets", value: next }) }) }
  const editMpPallet = (pallet: typeof mpPallets[number]) => { setEditingMpId(pallet.id); setMpForm({ bags: String(pallet.bags), lowerValueBags: String(pallet.lowerValueBags), lot: pallet.lot, expiry: pallet.expiry }) }
  const closeMpPallet = async () => {
    if (mpTotalKg <= 0 || !mpForm.lot || !mpForm.expiry) { setMessage("Preencha os sacos, lote e validade da palete MP."); return }
    const pallet = { id: editingMpId ?? `mp-${Date.now()}`, bags: Number(mpForm.bags || 0), lowerValueBags: Number(mpForm.lowerValueBags || 0), lot: mpForm.lot, expiry: mpForm.expiry, closedAt: editingMpId ? (mpPallets.find((item) => item.id === editingMpId)?.closedAt ?? new Date().toISOString()) : new Date().toISOString() }
    const next = editingMpId ? mpPallets.map((item) => item.id === editingMpId ? pallet : item) : [...mpPallets, pallet]
    await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_mp_pallets", value: next }) })
    setMpPallets(next)
    setEditingMpId(null)
    setMpForm({ bags: "", lowerValueBags: "", lot: "", expiry: "" })
    setMessage("Palete de matéria-prima fechada.")
  }
  const [products, setProducts] = useState<Product[]>([])
  const selectedProduct = products.find((product) => product.name === form.productName)
  const recipeMaterials = Array.isArray(selectedProduct?.materials) ? selectedProduct.materials : []
  const set = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const unitsToProduce = Number(form.dailyQuantity || form.totalToProduce || 0)
  const recipeMp = recipeMaterials.filter((material) => material.type === "MP")
  const recipeMe = recipeMaterials.filter((material) => material.type === "ME")
  const rawPerUnit = recipeMp.length ? recipeMp.reduce((sum, material) => sum + material.quantityPerUnit, 0) : 0
  const mpSurplus = Number(form.mpSurplus || 0)
  const requiredRawKg = Math.max(rawPerUnit * unitsToProduce - mpSurplus, 0)
  const requiredRawBags = Math.ceil(requiredRawKg / 25)
  const requiredMeUnits = recipeMe.reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const requiredMeBags = recipeMe.filter((material) => material.name.toLowerCase().includes("saco")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const requiredMeScoops = recipeMe.filter((material) => material.name.toLowerCase().includes("scoop")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const producedTotal = pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)
  const remainingToProduce = Math.max(unitsToProduce - producedTotal, 0)
  const theoreticalRawKg = Math.max(rawPerUnit * producedTotal - mpSurplus, 0)
  const actualMpKg = mpPallets.reduce((sum, pallet) => sum + pallet.bags * 25 + pallet.lowerValueBags, 0)
  const consumedRawKg = Math.max(actualMpKg - mpSurplus, 0)
  const producedRawKg = actualMpKg > 0 ? actualMpKg : theoreticalRawKg
  const producedMeUnits = recipeMe.reduce((sum, material) => sum + material.quantityPerUnit, 0) * producedTotal
  const producedMeBags = recipeMe.filter((material) => material.name.toLowerCase().includes("saco")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * producedTotal
  const producedMeScoops = recipeMe.filter((material) => material.name.toLowerCase().includes("scoop")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * producedTotal
  const theoreticalConsumedRawKg = rawPerUnit * producedTotal

  const theoreticalSurplusKg = consumedRawKg - theoreticalConsumedRawKg
  const rawWaste = Number(form.wasteMp || 0)
  const meWaste = Number(form.wasteMe || 0)
  const rawUsageDifference = Math.max(producedRawKg - theoreticalRawKg, 0)
  const meUsageDifference = meWaste
  const remainingRawKg = Math.max(requiredRawKg - theoreticalRawKg, 0)
  const bagWeight = rawPerUnit
  const canClose = Boolean(form.productName.trim() && form.productionDate && form.productionLot.trim() && form.productionExpiry && unitsToProduce > 0 && pallets.length > 0)
  const productionIncomplete = producedTotal < unitsToProduce
  const operatorsCount = Math.max(Number(form.operators || 0), 0)
  const startedAtMs = form.startedAt ? new Date(form.startedAt).getTime() : 0
  const elapsedMs = startedAtMs ? Math.max(now - startedAtMs, 0) : 0
  const manHours = (elapsedMs / 3600000) * operatorsCount
  const formatDuration = (ms: number) => { const totalSeconds = Math.floor(ms / 1000); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` }
  const formatBags = (kg: number) => { const sign = kg < 0 ? "-" : ""; const abs = Math.abs(kg); const whole = Math.floor(abs / 25); const rest = abs - whole * 25; return `${sign}${whole} ${whole === 1 ? "saco" : "sacos"} de 25 kg${rest > 0.001 ? ` + ${rest.toFixed(2)} kg` : ""}` }

  useEffect(() => { void import("@/lib/storage").then(({ loadProducts, getProducts }) => loadProducts().then(() => setProducts(getProducts()))).catch(() => {})
    void loadMaterialRequests().then((all) => setRoomRequests(all.filter((request) => request.requester.toLocaleLowerCase().includes("honetop") && request.status === "in_production"))).catch(() => {})
    void fetch("/api/data?key=honetop_mp_pallets").then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setMpPallets(payload.data) }).catch(() => {})
    void fetch("/api/data?key=honetop_production").then((response) => response.json()).then((payload) => { const saved = payload.data as ProductionState | undefined; if (saved) { setForm({ ...initial, ...saved }); setTubs(saved.tubs ?? 0); setPallets(Array.isArray(saved.pallets) ? saved.pallets : []) } }).catch(() => {}).finally(() => setLoaded(true))
    void fetch("/api/data?key=honetop_production_history").then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setHistory(payload.data) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!loaded) return
    const timeout = setTimeout(() => {
      void fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production", value: { ...form, tubs, pallets } }) }).catch(() => {})
    }, 500)
    return () => clearTimeout(timeout)
  }, [loaded, form, tubs, pallets])

  useEffect(() => {
    if (!form.startedAt) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [form.startedAt])

  async function consumeRoomStock(request: MaterialRequest) {
    const amount = Number(consume[request.id] ?? 0)
    const available = request.intermediateQuantity ?? request.quantity
    if (!Number.isFinite(amount) || amount <= 0 || amount > available) { setMessage("Indique um consumo válido dentro do stock da sala."); return }
    const all = await loadMaterialRequests()
    const next = all.map((entry) => entry.id === request.id ? { ...entry, intermediateQuantity: available - amount } : entry)
    await saveMaterialRequests(next)
    setRoomRequests(next.filter((entry) => entry.requester.toLocaleLowerCase().includes("honetop") && entry.status === "in_production"))
    setConsume((current) => ({ ...current, [request.id]: "" }))
    setMessage("Consumo deduzido do stock disponível na Honetop.")
  }

  async function requestMaterials() {
    if (unitsToProduce <= 0 || rawPerUnit <= 0) { setMessage("Selecione um produto com receita e indique a quantidade a produzir."); return }
    setRequesting(true)
    try {
      const current = await loadMaterialRequests()
      const now = new Date().toISOString()
      const requests: MaterialRequest[] = [
        { id: `request_honetop_me_bags_${Date.now()}`, stockItemId: "honetop-me-bags", materialName: `Sacos ME · ${form.productName || "Honetop"}`, quantity: requiredMeBags || unitsToProduce, unit: "un", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now, productionDate: form.requestProductionDate || form.productionDate || new Date().toISOString().slice(0, 10), productionLot: form.productionLot, productionExpiry: form.productionExpiry },
        { id: `request_honetop_me_scoops_${Date.now() + 1}`, stockItemId: "honetop-me-scoops", materialName: `Scoops ME · ${form.productName || "Honetop"}`, quantity: requiredMeScoops || unitsToProduce, unit: "un", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now, productionDate: form.requestProductionDate || form.productionDate || new Date().toISOString().slice(0, 10), productionLot: form.productionLot, productionExpiry: form.productionExpiry },
        { id: `request_honetop_raw_${Date.now() + 2}`, stockItemId: "honetop-raw-material", materialName: `Matéria-prima · ${form.productName || "Honetop"}`, quantity: requiredRawKg, unit: "kg", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now, productionDate: form.requestProductionDate || form.productionDate || new Date().toISOString().slice(0, 10), productionLot: form.productionLot, productionExpiry: form.productionExpiry },
      ]
      await saveMaterialRequests([...current, ...requests])
      setMessage("Requisição enviada ao armazém: sacos ME, scoops ME e matéria-prima.")
    } finally { setRequesting(false) }
  }

  async function addPallet() {
    if (!form.palletQuantity || !form.palletNumber || !form.lot || !form.expiry) { setMessage("Preencha quantidade, número, lote e validade da palete."); return }
    const pallet = { id: crypto.randomUUID(), quantity: Number(form.palletQuantity), number: form.palletNumber, lot: form.lot, expiry: form.expiry, channel: form.channel, createdAt: new Date().toISOString() }
    const next = [...pallets, pallet]
    setPallets(next)
    setForm((current) => ({ ...current, palletQuantity: "", palletNumber: "", lot: "", expiry: "" }))
    await fetch("/api/finished-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: form.productName || "Honetop", palletNumber: pallet.number, quantity: pallet.quantity, lot: form.productionLot || pallet.lot, expiryDate: pallet.expiry, productionDate: form.productionDate || new Date().toISOString().slice(0, 10), productionExpiry: form.productionExpiry, channel: pallet.channel }) })
    await save({ pallets: next })
    setMessage("Palete adicionada ao Produto Acabado.")
  }

  async function deletePallet(id: string) { const next = pallets.filter((pallet) => pallet.id !== id); setPallets(next); await save({ pallets: next }) }
  async function deleteHistory(index: number) { const next = history.filter((_, itemIndex) => itemIndex !== index); setHistory(next); await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production_history", value: next }) }) }
  async function save(overrides: Partial<ProductionState> = {}) { const state = { ...form, tubs, pallets, ...overrides }; await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production", value: state }) }) }
  async function closeProduction() { if (!canClose) { setMessage("Preencha produto, data, lote, validade, quantidade diária e registe pelo menos uma palete."); return } if (productionIncomplete) setMessage(`Produção fechada com ${producedTotal} de ${unitsToProduce} unidades programadas.`) const closedAt = new Date().toISOString(); const productionDurationMs = startedAtMs ? Math.max(new Date(closedAt).getTime() - startedAtMs, 0) : 0; const productionManHours = (productionDurationMs / 3600000) * operatorsCount; const materialSummary = recipeMaterials.map((material) => ({ type: material.type, name: material.name, code: material.code, unit: material.unit, quantityUsed: material.quantityPerUnit * producedTotal + (material.type === "MP" ? rawWaste : meWaste) })); const closed = { ...form, tubs, pallets, closedAt, summary: { producedBags: producedTotal, rawMaterialKg: consumedRawKg, roomEnteredMpKg: actualMpKg, theoreticalRawMaterialKg: theoreticalRawKg, mpSurplusKg: mpSurplus, rawMaterialBags: Math.ceil(consumedRawKg / 25), rawUsageDifferenceKg: rawUsageDifference + rawWaste, meUnits: producedMeUnits + meWaste, theoreticalMeUnits: producedMeUnits, meUsageDifferenceUnits: meUsageDifference, meWaste, rawMaterialWasteKg: rawWaste, remainingBags: remainingToProduce, remainingRawKg, materialSummary, startedAt: form.startedAt, operators: operatorsCount, productionDurationMs, productionManHours } }; const nextHistory = [...history, closed]; setHistory(nextHistory); await Promise.all([save(closed), fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production_history", value: nextHistory }) })]); setForm(initial); setTubs(0); setPallets([]); setMpPallets([]); setMpForm({ bags: "", lowerValueBags: "", lot: "", expiry: "" }); setEditingMpId(null); setConsume({}); setNow(Date.now()); await Promise.all([fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production", value: { ...initial, tubs: 0, pallets: [] } }) }), fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_mp_pallets", value: [] }) })]); setMessage("Produção fechada. Resumo de MP e ME guardado no histórico. Todos os campos e os sacos da sala foram reiniciados.") }
  const fields: Array<[keyof typeof initial, string, string]> = []

  return <main className="min-h-screen bg-background"><div className="relative mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><QualityEnvelope room="honetop" /><header className="flex flex-wrap items-center justify-between gap-4 pl-14"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/"><ArrowLeft /></Link></Button><div><p className="text-sm text-muted-foreground">Produção · Linha dedicada</p><h1 className="text-3xl font-bold tracking-tight">Honetop</h1><p className="text-sm text-muted-foreground">Fluxo: preparar → requisitar → consumir → fechar</p></div></div></header>{message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{message}</p>}
    <Card className="border-primary/30"><CardHeader><CardTitle>1. Preparar produção</CardTitle><p className="text-sm text-muted-foreground">Escolha o produto e indique a quantidade a produzir. A receita define os materiais necessários.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="product-name">Produto a produzir</Label><Input list="honetop-products" id="product-name" value={form.productName} onChange={(event) => set("productName", event.target.value)} placeholder="Pesquisar produto" /><datalist id="honetop-products">{products.map((product) => <option key={product.id} value={product.name}>{product.description}</option>)}</datalist></div><div><Label htmlFor="production-lot">Lote de produção acabado</Label><Input id="production-lot" value={form.productionLot} onChange={(event) => set("productionLot", event.target.value)} placeholder="Ex.: LOT-2026-001" /></div><div><Label htmlFor="top-total">Quantidade a produzir</Label><Input id="top-total" type="number" min="1" value={form.totalToProduce} onChange={(event) => set("totalToProduce", event.target.value)} /></div><div><Label htmlFor="top-weight">Peso por unidade</Label><select id="top-weight" className="h-10 w-full rounded-md border bg-background px-3" value={form.bagKg} onChange={(event) => set("bagKg", event.target.value)}><option value="0.5">500 g</option><option value="1">1 kg</option></select></div></div>{recipeMaterials.length > 0 && <div className="rounded-lg border border-primary/20 p-3"><p className="mb-2 text-sm font-medium">Receita selecionada</p><div className="flex flex-wrap gap-2">{recipeMaterials.map((material) => <span key={`${material.type}-${material.code}`} className="rounded-md bg-muted px-2 py-1 text-xs">{material.type} · {material.name} ({material.code}) · {material.quantityPerUnit} {material.unit}/un</span>)}</div></div>}<div className="rounded-lg border border-dashed p-3"><p className="text-sm font-medium">2. Requisitar materiais ao armazém</p><p className="mb-2 text-sm text-muted-foreground">Envie a necessidade calculada para a produção preparada.</p><div className="flex flex-wrap items-end gap-3"><div><Label htmlFor="request-production-date">Data da produção requisitada</Label><Input id="request-production-date" type="date" value={form.requestProductionDate} onChange={(event) => set("requestProductionDate", event.target.value)} /></div><div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"><span className="block text-xs text-muted-foreground">Produto</span><strong>{form.productName || "—"}</strong></div><div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"><span className="block text-xs text-muted-foreground">Quantidade</span><strong>{unitsToProduce > 0 ? `${unitsToProduce} unidades` : "—"}</strong></div><Button onClick={() => void requestMaterials()} disabled={requesting || unitsToProduce <= 0 || !form.productName.trim() || !form.requestProductionDate}>{requesting ? "A enviar..." : "Requisitar ao armazém"}</Button></div></div></CardContent></Card>
    <Card className="border-amber-500/40"><CardHeader><CardTitle>3. Fechar paletes de matéria-prima</CardTitle><p className="text-sm text-muted-foreground">Registe os sacos recebidos, o lote e a validade antes de iniciar o consumo.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label htmlFor="mp-bags">Sacos adicionados na sala</Label><Input id="mp-bags" type="number" min="0" value={mpForm.bags} onChange={(event) => mpSet("bags", event.target.value)} /></div><div><Label htmlFor="mp-lower">Sacos de menor valor (kg)</Label><Input id="mp-lower" type="number" min="0" step="0.01" value={mpForm.lowerValueBags} onChange={(event) => mpSet("lowerValueBags", event.target.value)} /></div><div><Label htmlFor="mp-lot">Lote usado</Label><Input id="mp-lot" value={mpForm.lot} onChange={(event) => mpSet("lot", event.target.value)} /></div><div><Label htmlFor="mp-expiry">Validade</Label><Input id="mp-expiry" type="date" value={mpForm.expiry} onChange={(event) => mpSet("expiry", event.target.value)} /></div></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Total: <strong className="text-foreground">{mpFullBags} sacos · {mpLowerKg.toFixed(2)} kg menor valor · {mpTotalKg.toFixed(2)} kg</strong></p><Button onClick={() => void closeMpPallet()}>Fechar palete MP</Button></div>{mpPallets.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{mpPallets.map((pallet) => <div key={pallet.id} className="relative rounded-lg border bg-muted/40 p-3 pr-16 text-sm"><div className="absolute right-2 top-2 flex gap-1"><Button variant="ghost" size="icon" className="size-7" aria-label="Editar palete MP" onClick={() => editMpPallet(pallet)}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Eliminar palete MP" onClick={() => void deleteMpPallet(pallet.id)}><Trash2 className="size-3.5" /></Button></div><strong>MP · {new Date(pallet.closedAt).toLocaleDateString("pt-PT")}</strong><p>{pallet.bags} sacos · {pallet.lowerValueBags.toFixed(2)} kg menor valor · {(pallet.bags * 25 + pallet.lowerValueBags).toFixed(2)} kg</p><p className="text-muted-foreground">Lote {pallet.lot} · Validade {pallet.expiry}</p></div>)}</div>}</CardContent></Card>
    <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Factory className="size-5" />4. Definir produção do dia e acompanhar consumo</CardTitle><p className="text-sm text-muted-foreground">Indique a data, lote, validade e quantidade que será fechada hoje. A calculadora usa esta quantidade como referência.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-4"><div><Label htmlFor="daily-date">Data de produção</Label><Input id="daily-date" type="date" value={form.productionDate} onChange={(event) => set("productionDate", event.target.value)} /></div><div><Label htmlFor="daily-lot">Lote acabado</Label><Input id="daily-lot" value={form.productionLot} onChange={(event) => set("productionLot", event.target.value)} /></div><div><Label htmlFor="daily-expiry">Validade</Label><Input id="daily-expiry" type="date" value={form.productionExpiry} onChange={(event) => set("productionExpiry", event.target.value)} /></div><div><Label htmlFor="daily-quantity">Quantidade a fechar hoje</Label><Input id="daily-quantity" type="number" min="1" value={form.dailyQuantity} onChange={(event) => set("dailyQuantity", event.target.value)} /></div><div><Label htmlFor="mp-surplus">Sobra de MP (kg)</Label><Input id="mp-surplus" type="number" min="0" step="0.01" value={form.mpSurplus} onChange={(event) => set("mpSurplus", event.target.value)} placeholder="Deduz ao teórico" /></div><div><Label htmlFor="operators">Nº de operadores</Label><Input id="operators" type="number" min="1" value={form.operators} onChange={(event) => set("operators", event.target.value)} /></div></div><div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3">{form.startedAt ? <><div><span className="text-xs text-muted-foreground">Produção em curso desde</span><strong className="block text-sm">{new Date(form.startedAt).toLocaleString("pt-PT")}</strong></div><div><span className="text-xs text-muted-foreground">Tempo decorrido</span><strong className="block font-mono text-lg tabular-nums">{formatDuration(elapsedMs)}</strong></div><div><span className="text-xs text-muted-foreground">Horas-homem</span><strong className="block text-lg">{manHours.toFixed(2)} h</strong></div></> : <p className="text-sm text-muted-foreground">Inicie a produção para medir o tempo e as horas-homem.</p>}<Button className="ml-auto" variant={form.startedAt ? "outline" : "default"} onClick={() => { set("startedAt", new Date().toISOString()); setNow(Date.now()); setMessage("Produção iniciada. O cronómetro está a contar.") }}>{form.startedAt ? "Reiniciar arranque" : "Arranque de produção"}</Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Falta produzir</span><strong className="block text-lg">{remainingToProduce} un.</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP real consumida</span><strong className="block text-lg">{consumedRawKg.toFixed(2)} kg</strong><small className="block">{formatBags(consumedRawKg)}</small><small className="block text-muted-foreground">Entrou {actualMpKg.toFixed(2)} − sobra real {mpSurplus.toFixed(2)} kg</small></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sobra teórica</span><strong className="block text-lg">{theoreticalSurplusKg.toFixed(2)} kg</strong><small className="block">{formatBags(theoreticalSurplusKg)}</small><small className="block text-muted-foreground">Consumido {consumedRawKg.toFixed(2)} − teórico {theoreticalConsumedRawKg.toFixed(2)} kg</small></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">ME real consumido</span><strong className="block text-lg">{producedMeBags.toFixed(0)} sacos · {producedMeScoops.toFixed(0)} scoops</strong><small className="block text-muted-foreground">Total {(producedMeUnits + meWaste).toFixed(2)} un. · desperdício {meWaste.toFixed(2)} un.</small></div></div><div className="space-y-3 rounded-lg border p-3"><p className="text-sm font-medium">Desperdício por material</p><div className="grid gap-3 sm:grid-cols-2">{recipeMaterials.map((material) => <div key={`waste-${material.code}`}><Label htmlFor={`waste-${material.code}`}>{material.type} · {material.name} ({material.code})</Label><Input id={`waste-${material.code}`} type="number" min="0" step="0.01" value={material.type === "MP" ? form.wasteMp : form.wasteMe} onChange={(event) => set(material.type === "MP" ? "wasteMp" : "wasteMe", event.target.value)} placeholder={`Desperdício em ${material.unit}`} /></div>)}</div></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, type]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type={type} min={type === "number" ? 0 : undefined} value={form[key]} onChange={(event) => set(key, event.target.value)} /> </div>)}</div><div className="flex justify-end border-t pt-4"><Button onClick={() => void closeProduction()} disabled={!canClose}><CheckCircle2 className="mr-2 size-4" />Fechar produção</Button></div></CardContent></Card>
    <Card><CardHeader><CardTitle>5. Registar paletes de produto acabado</CardTitle><p className="text-sm text-muted-foreground">Cada palete fica associada ao lote, validade, quantidade e destino.</p></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="palletQuantity">Sacos produzidos nesta palete</Label><Input id="palletQuantity" type="number" min="1" value={form.palletQuantity} onChange={(event) => set("palletQuantity", event.target.value)} /></div><div><Label htmlFor="palletNumber">Número da palete</Label><Input id="palletNumber" value={form.palletNumber} onChange={(event) => set("palletNumber", event.target.value)} /></div><div><Label htmlFor="palletLot">Lote</Label><Input id="palletLot" value={form.lot} onChange={(event) => set("lot", event.target.value)} /></div><div><Label htmlFor="palletExpiry">Validade</Label><Input id="palletExpiry" type="date" value={form.expiry} onChange={(event) => set("expiry", event.target.value)} /></div><div><Label htmlFor="channel">Destino</Label><select id="channel" className="h-10 w-full rounded-md border bg-background px-3" value={form.channel} onChange={(event) => set("channel", event.target.value)}><option>HQ</option><option>B2B</option></select></div><Button className="w-full" onClick={() => void addPallet()}>Registar palete</Button></CardContent></Card></section>
    {pallets.length > 0 && <Card><CardHeader><CardTitle>6. Rever e fechar produção</CardTitle><p className="text-sm text-muted-foreground">Confirme as paletes e consulte o histórico depois de fechar a produção.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pallets.map((pallet) => <div key={pallet.id} className="relative rounded-lg border p-3 pr-10"><Button variant="ghost" size="icon" className="absolute right-1 top-1 size-7 text-destructive" aria-label={`Eliminar palete ${pallet.number}`} onClick={() => void deletePallet(pallet.id)}><Trash2 className="size-3.5" /></Button><p className="font-medium">Palete {pallet.number}</p><p className="text-sm text-muted-foreground">{pallet.quantity} unidades · {pallet.channel}</p><p className="text-xs text-muted-foreground">Lote {pallet.lot} · Validade {pallet.expiry}</p></div>)}</div></CardContent></Card>}
    <Card><CardHeader><CardTitle>Histórico de produções fechadas</CardTitle></CardHeader><CardContent className="space-y-2">{history.length ? history.slice().reverse().map((production, index) => <div key={production.closedAt ?? index} className="relative rounded-lg border p-3 pr-10 text-sm"><Button variant="ghost" size="icon" className="absolute right-1 top-1 size-7 text-destructive" aria-label="Eliminar produção do histórico" onClick={() => void deleteHistory(history.length - 1 - index)}><Trash2 className="size-3.5" /></Button><strong>{new Date(production.closedAt ?? "").toLocaleString("pt-PT")}</strong>{(() => { const s = (production as ProductionState & { summary?: { rawMaterialKg?: number; roomEnteredMpKg?: number; mpSurplusKg?: number } }).summary; const kg = s?.roomEnteredMpKg != null ? Math.max(s.roomEnteredMpKg - (s.mpSurplusKg ?? 0), 0) : (s?.rawMaterialKg ?? 0); return <span className="ml-3 text-muted-foreground">{production.pallets.length} paletes · {production.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)} sacos · MP gasta: {kg.toFixed(2)} kg ({formatBags(kg)})</span> })()}{(() => { const summary = (production as ProductionState & { summary?: { productionDurationMs?: number; operators?: number; productionManHours?: number } }).summary; if (!summary?.productionDurationMs) return null; return <span className="ml-3 text-muted-foreground">· Tempo: {formatDuration(summary.productionDurationMs)} · {summary.operators ?? 0} operador(es) · {(summary.productionManHours ?? 0).toFixed(2)} horas-homem</span> })()}</div>) : <p className="text-sm text-muted-foreground">Nenhuma produção fechada.</p>}</CardContent></Card>
  </div></main>
}
