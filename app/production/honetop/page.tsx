"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Factory, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loadMaterialRequests, saveMaterialRequests } from "@/lib/storage"
import type { MaterialRequest, Product } from "@/lib/types"

const initial = { productName: "", totalToProduce: "", palletQuantity: "", palletNumber: "", channel: "HQ", wasteMp: "0", wasteMe: "0", bagsInRoom: "", bagKg: "", lowerValueBags: "", lot: "", expiry: "", requestedQuantity: "" }
type Pallet = { id: string; quantity: number; number: string; lot: string; expiry: string; channel: string; createdAt: string }
type ProductionState = typeof initial & { tubs: number; pallets: Pallet[]; closedAt?: string }

export default function HonetopProductionPage() {
  const [form, setForm] = useState(initial)
  const [tubs, setTubs] = useState(0)
  const [pallets, setPallets] = useState<Pallet[]>([])
  const [history, setHistory] = useState<ProductionState[]>([])
  const [message, setMessage] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [roomRequests, setRoomRequests] = useState<MaterialRequest[]>([])
  const [consume, setConsume] = useState<Record<string, string>>({})
  const [mpPallets, setMpPallets] = useState<Array<{ id: string; bags: number; lowerValueBags: number; lot: string; expiry: string; closedAt: string }>>([])
  const [mpForm, setMpForm] = useState({ bags: "", lowerValueBags: "", lot: "", expiry: "" })
  const mpSet = (field: keyof typeof mpForm, value: string) => setMpForm((current) => ({ ...current, [field]: value }))
  const mpBagsTotal = Number(mpForm.bags || 0) + Number(mpForm.lowerValueBags || 0)
  const closeMpPallet = async () => {
    if (mpBagsTotal <= 0 || !mpForm.lot || !mpForm.expiry) { setMessage("Preencha os sacos, lote e validade da palete MP."); return }
    const pallet = { id: `mp-${Date.now()}`, bags: Number(mpForm.bags || 0), lowerValueBags: Number(mpForm.lowerValueBags || 0), lot: mpForm.lot, expiry: mpForm.expiry, closedAt: new Date().toISOString() }
    const next = [...mpPallets, pallet]
    await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_mp_pallets", value: next }) })
    setMpPallets(next)
    setMpForm({ bags: "", lowerValueBags: "", lot: "", expiry: "" })
    setMessage("Palete de matéria-prima fechada.")
  }
  const [products, setProducts] = useState<Product[]>([])
  const selectedProduct = products.find((product) => product.name === form.productName)
  const recipeMaterials = selectedProduct?.materials ?? []
  const set = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const unitsToProduce = Number(form.totalToProduce || 0)
  const recipeMp = recipeMaterials.filter((material) => material.type === "MP")
  const recipeMe = recipeMaterials.filter((material) => material.type === "ME")
  const rawPerUnit = recipeMp.length ? recipeMp.reduce((sum, material) => sum + material.quantityPerUnit, 0) : 0
  const requiredRawKg = rawPerUnit * unitsToProduce
  const requiredRawBags = Math.ceil(requiredRawKg / 25)
  const requiredMeUnits = recipeMe.reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const requiredMeBags = recipeMe.filter((material) => material.name.toLowerCase().includes("saco")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const requiredMeScoops = recipeMe.filter((material) => material.name.toLowerCase().includes("scoop")).reduce((sum, material) => sum + material.quantityPerUnit, 0) * unitsToProduce
  const producedTotal = pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)
  const remainingToProduce = Math.max(unitsToProduce - producedTotal, 0)
  const producedRawKg = recipeMp.length ? recipeMp.reduce((sum, material) => sum + material.quantityPerUnit, 0) * producedTotal : 0
  const producedMeUnits = recipeMe.reduce((sum, material) => sum + material.quantityPerUnit, 0) * producedTotal
  const rawWaste = Number(form.wasteMp || 0)
  const meWaste = Number(form.wasteMe || 0)
  const remainingRawKg = Math.max(requiredRawKg - producedRawKg, 0)
  const bagWeight = rawPerUnit
  const bagsRemaining = 0
  const palletRawKg = rawPerUnit * Number(form.palletQuantity || 0)
  const palletRawBags = Math.ceil(palletRawKg / 25)
  const canClose = Boolean(form.bagsInRoom && form.totalToProduce && pallets.length && form.lot && form.expiry)

  useEffect(() => { void import("@/lib/storage").then(({ loadProducts, getProducts }) => loadProducts().then(() => setProducts(getProducts()))).catch(() => {})
    void loadMaterialRequests().then((all) => setRoomRequests(all.filter((request) => request.requester.toLocaleLowerCase().includes("honetop") && request.status === "in_production"))).catch(() => {})
    void fetch("/api/data?key=honetop_mp_pallets").then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setMpPallets(payload.data) }).catch(() => {})
    void fetch("/api/data?key=honetop_production").then((response) => response.json()).then((payload) => { const saved = payload.data as ProductionState | undefined; if (saved) { setForm(saved); setTubs(saved.tubs); setPallets(saved.pallets ?? []) } }).catch(() => {})
    void fetch("/api/data?key=honetop_production_history").then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setHistory(payload.data) }).catch(() => {})
  }, [])

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
    if (unitsToProduce <= 0 || bagWeight <= 0) { setMessage("Indique a quantidade a produzir e o peso por unidade."); return }
    setRequesting(true)
    try {
      const current = await loadMaterialRequests()
      const now = new Date().toISOString()
      const requests: MaterialRequest[] = [
        { id: `request_honetop_me_bags_${Date.now()}`, stockItemId: "honetop-me-bags", materialName: `Sacos ME · ${form.productName || "Honetop"}`, quantity: requiredMeBags || unitsToProduce, unit: "un", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now },
        { id: `request_honetop_me_scoops_${Date.now() + 1}`, stockItemId: "honetop-me-scoops", materialName: `Scoops ME · ${form.productName || "Honetop"}`, quantity: requiredMeScoops || unitsToProduce, unit: "un", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now },
        { id: `request_honetop_raw_${Date.now() + 2}`, stockItemId: "honetop-raw-material", materialName: `Matéria-prima · ${form.productName || "Honetop"}`, quantity: requiredRawKg, unit: "kg", requester: "Produção Honetop", destinationRoom: "Honetop", status: "requested", requestedAt: now },
      ]
      await saveMaterialRequests([...current, ...requests])
      setMessage("Requisição enviada ao armazém: sacos ME, scoops ME e matéria-prima.")
    } finally { setRequesting(false) }
  }

  async function addPallet() {
    if (!form.palletQuantity || !form.palletNumber) { setMessage("Preencha a quantidade e o número da palete."); return }
    const pallet = { id: crypto.randomUUID(), quantity: Number(form.palletQuantity), number: form.palletNumber, lot: "", expiry: "", channel: form.channel, createdAt: new Date().toISOString() }
    const next = [...pallets, pallet]
    setPallets(next)
    setForm((current) => ({ ...current, palletQuantity: "", palletNumber: "" }))
    await fetch("/api/finished-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: "Honetop", palletNumber: pallet.number, quantity: pallet.quantity, lot: pallet.lot, expiryDate: pallet.expiry, productionDate: new Date().toISOString().slice(0, 10) }) })
    await save({ pallets: next })
    setMessage("Palete adicionada ao Produto Acabado.")
  }

  async function save(overrides: Partial<ProductionState> = {}) { const state = { ...form, tubs, pallets, ...overrides }; await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production", value: state }) }) }
  async function closeProduction() { if (!canClose) { setMessage("Preencha os campos obrigatórios e registe pelo menos uma palete."); return } const closed = { ...form, tubs, pallets, closedAt: new Date().toISOString(), summary: { producedBags: producedTotal, rawMaterialKg: producedRawKg + rawWaste, rawMaterialBags: Math.ceil((producedRawKg + rawWaste) / 25), meUnits: producedMeUnits + meWaste, meWaste, rawMaterialWasteKg: rawWaste, remainingBags: remainingToProduce, remainingRawKg } }; const nextHistory = [...history, closed]; setHistory(nextHistory); await Promise.all([save(closed), fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production_history", value: nextHistory }) })]); setMessage("Produção fechada e guardada no histórico.") }
  const fields: Array<[keyof typeof initial, string, string]> = []

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/"><ArrowLeft /></Link></Button><div><p className="text-sm text-muted-foreground">Produção · Linha dedicada</p><h1 className="text-3xl font-bold tracking-tight">Honetop</h1></div></div><Button onClick={() => void closeProduction()}><CheckCircle2 className="mr-2 size-4" />Fechar produção</Button></header>{message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{message}</p>}
    <Card className="border-blue-500/40"><CardHeader><CardTitle>Stock disponível na sala Honetop</CardTitle></CardHeader><CardContent className="space-y-3">{roomRequests.length ? roomRequests.map((request) => <div key={request.id} className="flex flex-wrap items-end justify-between gap-3 rounded-lg border p-3"><div><strong>{request.materialName}</strong><p className="text-sm text-muted-foreground">Disponível: {request.intermediateQuantity ?? request.quantity} {request.unit}</p></div><div className="flex items-end gap-2"><div><Label htmlFor={`consume-${request.id}`}>Consumir</Label><Input id={`consume-${request.id}`} type="number" min="0" max={request.intermediateQuantity ?? request.quantity} value={consume[request.id] ?? ""} onChange={(event) => setConsume((current) => ({ ...current, [request.id]: event.target.value }))} className="w-28" /></div><Button size="sm" onClick={() => void consumeRoomStock(request)}>Registar consumo</Button></div></div>) : <p className="text-sm text-muted-foreground">Nenhum material transferido para esta sala.</p>}</CardContent></Card>
    <Card className="border-primary/30"><CardHeader><CardTitle>1. Quantidade a produzir e requisição</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="product-name">Produto a produzir</Label><Input list="honetop-products" id="product-name" value={form.productName} onChange={(event) => set("productName", event.target.value)} placeholder="Pesquisar produto" /><datalist id="honetop-products">{products.map((product) => <option key={product.id} value={product.name}>{product.description}</option>)}</datalist></div><div><Label htmlFor="top-total">Quantidade a produzir</Label><Input id="top-total" type="number" min="1" value={form.totalToProduce} onChange={(event) => set("totalToProduce", event.target.value)} /></div><div><Label htmlFor="top-weight">Peso por unidade</Label><select id="top-weight" className="h-10 w-full rounded-md border bg-background px-3" value={form.bagKg} onChange={(event) => set("bagKg", event.target.value)}><option value="0.5">500 g</option><option value="1">1 kg</option></select></div></div>{recipeMaterials.length > 0 && <div className="rounded-lg border border-primary/20 p-3"><p className="mb-2 text-sm font-medium">Receita selecionada</p><div className="flex flex-wrap gap-2">{recipeMaterials.map((material) => <span key={`${material.type}-${material.code}`} className="rounded-md bg-muted px-2 py-1 text-xs">{material.type} · {material.name} ({material.code}) · {material.quantityPerUnit} {material.unit}/un</span>)}</div></div>}<div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP necessária</span><strong className="block text-lg">{requiredRawKg.toFixed(2)} kg</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos de 25 kg</span><strong className="block text-lg">{requiredRawBags}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos ME</span><strong className="block text-lg">{requiredMeBags}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Scoops ME</span><strong className="block text-lg">{requiredMeScoops}</strong></div></div><Button onClick={() => void requestMaterials()} disabled={requesting || unitsToProduce <= 0 || !form.productName.trim()}>{requesting ? "A enviar..." : "Requisitar ao armazém"}</Button></CardContent></Card>
    <Card className="border-amber-500/40"><CardHeader><CardTitle>Palete de matéria-prima</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label htmlFor="mp-bags">Sacos adicionados na sala</Label><Input id="mp-bags" type="number" min="0" value={mpForm.bags} onChange={(event) => mpSet("bags", event.target.value)} /></div><div><Label htmlFor="mp-lower">Sacos de menor valor</Label><Input id="mp-lower" type="number" min="0" value={mpForm.lowerValueBags} onChange={(event) => mpSet("lowerValueBags", event.target.value)} /></div><div><Label htmlFor="mp-lot">Lote usado</Label><Input id="mp-lot" value={mpForm.lot} onChange={(event) => mpSet("lot", event.target.value)} /></div><div><Label htmlFor="mp-expiry">Validade</Label><Input id="mp-expiry" type="date" value={mpForm.expiry} onChange={(event) => mpSet("expiry", event.target.value)} /></div></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Total: <strong className="text-foreground">{mpBagsTotal} sacos · {(mpBagsTotal * 25).toFixed(2)} kg</strong></p><Button onClick={() => void closeMpPallet()}>Fechar palete MP</Button></div>{mpPallets.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{mpPallets.map((pallet) => <div key={pallet.id} className="rounded-lg border bg-muted/40 p-3 text-sm"><strong>MP · {new Date(pallet.closedAt).toLocaleDateString("pt-PT")}</strong><p>{pallet.bags + pallet.lowerValueBags} sacos · {((pallet.bags + pallet.lowerValueBags) * 25).toFixed(2)} kg</p><p className="text-muted-foreground">Lote {pallet.lot} · Validade {pallet.expiry}</p></div>)}</div>}</CardContent></Card>
    <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Factory className="size-5" />Calculadora de produção</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Falta produzir</span><strong className="block text-lg">{remainingToProduce} un.</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP gasta</span><strong className="block text-lg">{(producedRawKg + rawWaste).toFixed(2)} kg</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">ME gasto</span><strong className="block text-lg">{(producedMeUnits + meWaste).toFixed(2)} un.</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP restante</span><strong className="block text-lg">{remainingRawKg.toFixed(2)} kg</strong></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="wasteMp">Desperdício MP (kg)</Label><Input id="wasteMp" type="number" min="0" step="0.01" value={form.wasteMp} onChange={(event) => set("wasteMp", event.target.value)} /></div><div><Label htmlFor="wasteMe">Desperdício ME (un.)</Label><Input id="wasteMe" type="number" min="0" step="1" value={form.wasteMe} onChange={(event) => set("wasteMe", event.target.value)} /></div></div><div className="flex justify-end"><Button onClick={() => void closeProduction()} disabled={unitsToProduce <= 0 || pallets.length === 0}>Fechar produção</Button></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, type]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type={type} min={type === "number" ? 0 : undefined} value={form[key]} onChange={(event) => set(key, event.target.value)} /> </div>)}</div>{recipeMaterials.length > 0 && <div className="rounded-lg border border-primary/20 p-3"><p className="mb-2 text-sm font-medium">Receita selecionada</p><div className="flex flex-wrap gap-2">{recipeMaterials.map((material) => <span key={`${material.type}-${material.code}`} className="rounded-md bg-muted px-2 py-1 text-xs">{material.type} · {material.name} ({material.code}) · {material.quantityPerUnit} {material.unit}/un</span>)}</div></div>}<div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP necessária</span><strong className="block text-lg">{requiredRawKg.toFixed(2)} kg</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos de 25 kg</span><strong className="block text-lg">{requiredRawBags}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos ME</span><strong className="block text-lg">{requiredMeBags}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Scoops ME</span><strong className="block text-lg">{requiredMeScoops}</strong></div></div><div className="flex justify-end"><Button onClick={() => void requestMaterials()} disabled={requesting || unitsToProduce <= 0 || !form.productName.trim()}>{requesting ? "A enviar..." : "Requisitar ao armazém"}</Button></div><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP nesta palete</span><strong className="block text-lg">{palletRawKg.toFixed(2)} kg</strong><small>{palletRawBags} saco(s) de 25 kg</small></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos produzidos</span><strong className="block text-lg">{producedTotal}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Falta produzir</span><strong className="block text-lg">{remainingToProduce}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">MP restante</span><strong className="block text-lg">{remainingRawKg.toFixed(2)} kg</strong></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Matéria-prima na palete</span><strong className="block text-lg">{palletRawKg.toFixed(2)} kg</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos em sala</span><strong className="block text-lg">{bagsRemaining}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Falta produzir</span><strong className="block text-lg">{remainingToProduce}</strong></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { const next = tubs + 1; setTubs(next); void save({ tubs: next }) }}><Plus className="mr-2 size-4" />Adicionar saco à cuba</Button><Button variant="ghost" onClick={() => { const next = Math.max(tubs - 1, 0); setTubs(next); void save({ tubs: next }) }}><X className="mr-2 size-4" />Retirar saco da cuba</Button></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Adicionar palete</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="palletQuantity">Sacos produzidos nesta palete</Label><Input id="palletQuantity" type="number" min="1" value={form.palletQuantity} onChange={(event) => set("palletQuantity", event.target.value)} /></div><div><Label htmlFor="palletNumber">Número da palete</Label><Input id="palletNumber" value={form.palletNumber} onChange={(event) => set("palletNumber", event.target.value)} /></div><div><Label htmlFor="channel">Destino</Label><select id="channel" className="h-10 w-full rounded-md border bg-background px-3" value={form.channel} onChange={(event) => set("channel", event.target.value)}><option>HQ</option><option>B2B</option></select></div><Button className="w-full" onClick={() => void addPallet()}>Registar palete</Button></CardContent></Card></section>
    <Card><CardHeader><CardTitle>Paletes desta produção</CardTitle></CardHeader><CardContent>{pallets.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pallets.map((pallet) => <div key={pallet.id} className="rounded-lg border p-3"><p className="font-medium">Palete {pallet.number}</p><p className="text-sm text-muted-foreground">{pallet.quantity} unidades · {pallet.channel}</p><p className="text-xs text-muted-foreground">Lote {pallet.lot} · Validade {pallet.expiry}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Ainda não existem paletes registadas.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Histórico de produções fechadas</CardTitle></CardHeader><CardContent className="space-y-2">{history.length ? history.slice().reverse().map((production, index) => <div key={production.closedAt ?? index} className="rounded-lg border p-3 text-sm"><strong>{new Date(production.closedAt ?? "").toLocaleString("pt-PT")}</strong><span className="ml-3 text-muted-foreground">{production.pallets.length} paletes · {production.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)} sacos · MP gasta: {(production.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0) * Number(production.bagKg || 0)).toFixed(2)} kg</span></div>) : <p className="text-sm text-muted-foreground">Nenhuma produção fechada.</p>}</CardContent></Card>
  </div></main>
}
