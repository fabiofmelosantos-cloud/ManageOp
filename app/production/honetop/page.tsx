"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Factory, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initial = { bagsInRoom: "", bagKg: "0.5", lowerValueBags: "", producedUnits: "", totalToProduce: "", lot: "", expiry: "", requestedQuantity: "", palletQuantity: "", palletNumber: "", channel: "HQ" }
type Pallet = { id: string; quantity: number; number: string; lot: string; expiry: string; channel: string; createdAt: string }
type ProductionState = typeof initial & { tubs: number; pallets: Pallet[]; closedAt?: string }

export default function HonetopProductionPage() {
  const [form, setForm] = useState(initial)
  const [tubs, setTubs] = useState(0)
  const [pallets, setPallets] = useState<Pallet[]>([])
  const [history, setHistory] = useState<ProductionState[]>([])
  const [message, setMessage] = useState("")
  const set = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const consumedBags = tubs + Number(form.lowerValueBags || 0)
  const bagsRemaining = Math.max(Number(form.bagsInRoom || 0) - consumedBags, 0)
  const producedTotal = pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)
  const remainingToProduce = Math.max(Number(form.totalToProduce || 0) - producedTotal, 0)
  const palletRawKg = (Number(form.palletQuantity || 0) * Number(form.bagKg || 0))
  const canClose = Boolean(form.bagsInRoom && form.totalToProduce && pallets.length && form.lot && form.expiry)

  useEffect(() => { void fetch("/api/data?key=honetop_production").then((response) => response.json()).then((payload) => { const saved = payload.data as ProductionState | undefined; if (saved) { setForm(saved); setTubs(saved.tubs); setPallets(saved.pallets ?? []) } }).catch(() => {})
    void fetch("/api/data?key=honetop_production_history").then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setHistory(payload.data) }).catch(() => {})
  }, [])

  async function addPallet() {
    if (!form.palletQuantity || !form.palletNumber || !form.lot || !form.expiry) { setMessage("Preencha quantidade, número, lote e validade da palete."); return }
    const pallet = { id: crypto.randomUUID(), quantity: Number(form.palletQuantity), number: form.palletNumber, lot: form.lot, expiry: form.expiry, channel: form.channel, createdAt: new Date().toISOString() }
    const next = [...pallets, pallet]
    setPallets(next)
    setForm((current) => ({ ...current, palletQuantity: "", palletNumber: "" }))
    await fetch("/api/finished-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: "Honetop", palletNumber: pallet.number, quantity: pallet.quantity, lot: pallet.lot, expiryDate: pallet.expiry, productionDate: new Date().toISOString().slice(0, 10) }) })
    await save({ pallets: next })
    setMessage("Palete adicionada ao Produto Acabado.")
  }

  async function save(overrides: Partial<ProductionState> = {}) { const state = { ...form, tubs, pallets, ...overrides }; await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production", value: state }) }) }
  async function closeProduction() { if (!canClose) { setMessage("Preencha os campos obrigatórios e registe pelo menos uma palete."); return } const closed = { ...form, tubs, pallets, closedAt: new Date().toISOString() }; const nextHistory = [...history, closed]; setHistory(nextHistory); await Promise.all([save(closed), fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "honetop_production_history", value: nextHistory }) })]); setMessage("Produção fechada e guardada no histórico.") }
  const fields: Array<[keyof typeof initial, string, string]> = [["bagsInRoom", "Sacos entrados na sala", "number"], ["lowerValueBags", "Sacos de menor valor", "number"], ["producedUnits", "Unidades produzidas", "number"], ["totalToProduce", "Total a produzir", "number"], ["requestedQuantity", "Quantidade requisitada", "number"], ["lot", "Lote", "text"], ["expiry", "Validade", "date"]]

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/"><ArrowLeft /></Link></Button><div><p className="text-sm text-muted-foreground">Produção · Linha dedicada</p><h1 className="text-3xl font-bold tracking-tight">Honetop</h1></div></div><Button onClick={() => void closeProduction()}><CheckCircle2 className="mr-2 size-4" />Fechar produção</Button></header>{message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{message}</p>}
    <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Factory className="size-5" />Calculadora de produção</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, type]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type={type} min={type === "number" ? 0 : undefined} value={form[key]} onChange={(event) => set(key, event.target.value)} /> </div>)}<div><Label htmlFor="bagKg">Kg por saco de matéria-prima</Label><select id="bagKg" className="h-10 w-full rounded-md border bg-background px-3" value={form.bagKg} onChange={(event) => set("bagKg", event.target.value)}><option value="0.25">0,25 kg</option><option value="0.5">0,5 kg</option><option value="1">1 kg</option></select></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Matéria-prima na palete</span><strong className="block text-lg">{palletRawKg.toFixed(2)} kg</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Sacos em sala</span><strong className="block text-lg">{bagsRemaining}</strong></div><div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Falta produzir</span><strong className="block text-lg">{remainingToProduce}</strong></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { const next = tubs + 1; setTubs(next); void save({ tubs: next }) }}><Plus className="mr-2 size-4" />Adicionar saco à cuba</Button><Button variant="ghost" onClick={() => { const next = Math.max(tubs - 1, 0); setTubs(next); void save({ tubs: next }) }}><X className="mr-2 size-4" />Retirar saco da cuba</Button></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Adicionar palete</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="palletQuantity">Quantidade produzida</Label><Input id="palletQuantity" type="number" min="1" value={form.palletQuantity} onChange={(event) => set("palletQuantity", event.target.value)} /></div><div><Label htmlFor="palletNumber">Número da palete</Label><Input id="palletNumber" value={form.palletNumber} onChange={(event) => set("palletNumber", event.target.value)} /></div><div><Label htmlFor="channel">Destino</Label><select id="channel" className="h-10 w-full rounded-md border bg-background px-3" value={form.channel} onChange={(event) => set("channel", event.target.value)}><option>HQ</option><option>B2B</option></select></div><Button className="w-full" onClick={() => void addPallet()}>Registar palete</Button></CardContent></Card></section>
    <Card><CardHeader><CardTitle>Paletes desta produção</CardTitle></CardHeader><CardContent>{pallets.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pallets.map((pallet) => <div key={pallet.id} className="rounded-lg border p-3"><p className="font-medium">Palete {pallet.number}</p><p className="text-sm text-muted-foreground">{pallet.quantity} unidades · {pallet.channel}</p><p className="text-xs text-muted-foreground">Lote {pallet.lot} · Validade {pallet.expiry}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Ainda não existem paletes registadas.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Histórico de produções fechadas</CardTitle></CardHeader><CardContent className="space-y-2">{history.length ? history.slice().reverse().map((production, index) => <div key={production.closedAt ?? index} className="rounded-lg border p-3 text-sm"><strong>{new Date(production.closedAt ?? "").toLocaleString("pt-PT")}</strong><span className="ml-3 text-muted-foreground">{production.pallets.length} paletes · {production.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0)} unidades</span></div>) : <p className="text-sm text-muted-foreground">Nenhuma produção fechada.</p>}</CardContent></Card>
  </div></main>
}
