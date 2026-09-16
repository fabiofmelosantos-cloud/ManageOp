"use client"

import { FormEvent, useEffect, useState } from "react"
import { Check, ClipboardCheck, PackageCheck, Pencil, Truck, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type FinishedProduct } from "@/lib/types"

type EditForm = { product: string; palletNumber: string; quantity: string; lot: string; expiryDate: string; productionDate: string; channel: "HQ" | "B2B" }

export function FinishedProductsPage() {
  const [items, setItems] = useState<FinishedProduct[]>([])
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({ product: "", palletNumber: "", quantity: "", lot: "", expiryDate: "", productionDate: new Date().toISOString().slice(0, 10) })
  const [shipping, setShipping] = useState<Record<string, { date: string; quantity: string; lot: string; pallet: string }>>({})
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ product: "", palletNumber: "", quantity: "", lot: "", expiryDate: "", productionDate: "", channel: "HQ" })

  async function refresh() { const response = await fetch("/api/finished-products"); if (response.ok) setItems(await response.json()) }
  useEffect(() => { void refresh() }, [])

  function startEdit(item: FinishedProduct) {
    setEditingId(item.id)
    setEditForm({ product: item.product, palletNumber: item.palletNumber, quantity: String(item.quantity), lot: item.lot, expiryDate: item.expiryDate, productionDate: item.productionDate, channel: item.channel })
  }
  async function saveEdit(id: string) {
    setError("")
    const quantity = Number(editForm.quantity)
    if (!editForm.product.trim() || !editForm.palletNumber.trim() || !editForm.lot.trim() || !editForm.expiryDate || !editForm.productionDate || !Number.isFinite(quantity) || quantity <= 0) {
      setError("Preencha o produto, palete, quantidade, lote, validade e data de produção.")
      return
    }
    const response = await fetch("/api/finished-products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "edit", ...editForm, quantity }) })
    if (!response.ok) { setError("Não foi possível guardar as alterações."); return }
    setEditingId(null)
    void refresh()
  }

  const filteredItems = items.filter((item) => [item.product, item.lot, item.palletNumber, item.shippedLot, item.shippedPalletNumber, item.warehouseValidatedBy].filter(Boolean).join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase()))

  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const response = await fetch("/api/finished-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (!response.ok) return setError("Preencha os dados da palete."); setForm({ ...form, product: "", palletNumber: "", quantity: "", lot: "", expiryDate: "" }); void refresh() }
  async function removeProduct(id: string) {
    if (!window.confirm("Eliminar este produto acabado?")) return
    const response = await fetch(`/api/finished-products?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (response.ok) void refresh()
  }

  async function validate(id: string) { const response = await fetch("/api/finished-products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "warehouse_validate", validatedBy: "Armazém" }) }); if (response.ok) void refresh() }
  async function ship(id: string) {
    setError("")
    const data = shipping[id]
    const shippedDate = String(data?.date ?? "").trim()
    const shippedQuantity = Number(data?.quantity ?? 0)
    const shippedLot = String(data?.lot ?? "").trim()
    const shippedPalletNumber = String(data?.pallet ?? "").trim()
    if (!shippedDate || !Number.isFinite(shippedQuantity) || shippedQuantity <= 0 || !shippedLot || !shippedPalletNumber) {
      setError("Preencha a data, quantidade, lote e número da palete antes de expedir.")
      return
    }

    try {
      const response = await fetch("/api/finished-products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "ship",
          shippedAt: shippedDate,
          shippedQuantity,
          shippedLot,
          shippedPalletNumber,
        }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        setError(result?.error ?? "Valide a palete e preencha os dados da expedição.")
        return
      }
      await refresh()
    } catch {
      setError("Não foi possível comunicar com o servidor. Tente novamente.")
    }
  }

  return <main className="min-h-screen bg-background p-4 sm:p-8"><div className="mx-auto flex max-w-7xl flex-col gap-8"><header className="flex items-center gap-3"><PackageCheck className="size-8 text-primary" /><div><h1 className="text-3xl font-bold tracking-tight">SAÍDA DE PRODUTO ACABADO</h1><p className="text-muted-foreground">Histórico de saídas do armazém em unidades, com dupla confirmação.</p></div></header><form onSubmit={create} className="grid items-end gap-3 border-b pb-5 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_1.2fr_auto]"><div className="grid gap-1.5"><Label>Produto</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required /></div><div className="grid gap-1.5"><Label>Nº da palete</Label><Input value={form.palletNumber} onChange={(e) => setForm({ ...form, palletNumber: e.target.value })} required /></div><div className="grid gap-1.5"><Label>Quantidade</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></div><div className="grid gap-1.5"><Label>Lote</Label><Input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} required /></div><div className="grid gap-1.5"><Label>Validade</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required /></div><div className="grid gap-1.5"><Label>Data produção</Label><Input type="date" value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} required /></div><Button type="submit"><PackageCheck data-icon="inline-start" />Dar entrada</Button></form><div className="flex items-center gap-3 border-b pb-5"><Label htmlFor="finished-product-search" className="sr-only">Pesquisar histórico</Label><Input id="finished-product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto, lote ou palete..." className="max-w-xl" /></div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<div className="overflow-x-auto"><div className="min-w-[1320px] divide-y rounded-lg border"><div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1.5fr_auto] gap-3 bg-muted/50 px-4 py-3 text-sm font-medium"><span>Produto / palete</span><span>Quantidade (un.)</span><span>Lote</span><span>Validade</span><span>Estado</span><span>Armazém / expedição</span><span className="text-right">Ações</span></div>{items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma palete registada.</p> : filteredItems.map((item) => editingId === item.id ? <div key={item.id} className="grid gap-3 border-l-2 border-primary px-4 py-4 sm:grid-cols-2 lg:grid-cols-4"><div className="flex flex-col gap-1.5"><Label className="text-xs">Produto</Label><Input value={editForm.product} onChange={(e) => setEditForm({ ...editForm, product: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Nº da palete</Label><Input value={editForm.palletNumber} onChange={(e) => setEditForm({ ...editForm, palletNumber: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Quantidade</Label><Input type="number" min="1" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Lote</Label><Input value={editForm.lot} onChange={(e) => setEditForm({ ...editForm, lot: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Validade</Label><Input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Data produção</Label><Input type="date" value={editForm.productionDate} onChange={(e) => setEditForm({ ...editForm, productionDate: e.target.value })} /></div><div className="flex flex-col gap-1.5"><Label className="text-xs">Destino</Label><Select value={editForm.channel} onValueChange={(value) => setEditForm({ ...editForm, channel: value as "HQ" | "B2B" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HQ">HQ</SelectItem><SelectItem value="B2B">B2B</SelectItem></SelectContent></Select></div><div className="flex items-end gap-2"><Button size="sm" onClick={() => void saveEdit(item.id)}><Check data-icon="inline-start" />Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X data-icon="inline-start" />Cancelar</Button></div></div> : <article key={item.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1.5fr_auto] items-center gap-3 px-4 py-4 text-sm"><div><p className="font-semibold">{item.product}</p><p className="text-muted-foreground">Palete {item.palletNumber}</p></div><span>{item.quantity} {item.unit}</span><span>{item.lot}</span><span>{item.expiryDate}</span><Badge variant={item.shippedAt ? "default" : item.warehouseValidatedAt ? "secondary" : "outline"}>{item.shippedAt ? "Expedida" : item.warehouseValidatedAt ? "Validada" : "A validar"}</Badge><div className="flex flex-col gap-2">{!item.warehouseValidatedAt && <Button size="sm" variant="outline" onClick={() => void validate(item.id)}><ClipboardCheck data-icon="inline-start" />Validar armazém</Button>}{item.warehouseValidatedAt && !item.shippedAt && <div className="flex items-end gap-2"><Input type="date" aria-label="Data expedição" value={shipping[item.id]?.date ?? ""} onChange={(e) => setShipping({ ...shipping, [item.id]: { ...(shipping[item.id] ?? { quantity: String(item.quantity), lot: item.lot, pallet: item.palletNumber }), date: e.target.value } })} /><Input aria-label="Quantidade expedida" placeholder="Qtd." value={shipping[item.id]?.quantity ?? String(item.quantity)} onChange={(e) => setShipping({ ...shipping, [item.id]: { ...(shipping[item.id] ?? { date: "", lot: item.lot, pallet: item.palletNumber }), quantity: e.target.value } })} /><Input aria-label="Lote expedido" placeholder="Lote" value={shipping[item.id]?.lot ?? item.lot} onChange={(e) => setShipping({ ...shipping, [item.id]: { ...(shipping[item.id] ?? { date: "", quantity: String(item.quantity), pallet: item.palletNumber }), lot: e.target.value } })} /><Input aria-label="Palete expedida" placeholder="Palete" value={shipping[item.id]?.pallet ?? item.palletNumber} onChange={(e) => setShipping({ ...shipping, [item.id]: { ...(shipping[item.id] ?? { date: "", quantity: String(item.quantity), lot: item.lot }), pallet: e.target.value } })} /><Button size="sm" onClick={() => void ship(item.id)}><Truck data-icon="inline-start" />Expedir</Button></div>}{item.shippedAt && <span className="text-muted-foreground">Expedida em {item.shippedAt} · {item.shippedQuantity} · lote {item.shippedLot} · palete {item.shippedPalletNumber}</span>}</div><div className="flex items-center justify-end gap-1">{!item.shippedAt && <Button size="icon" variant="ghost" onClick={() => startEdit(item)} aria-label="Editar produto acabado"><Pencil /></Button>}<Button size="icon" variant="ghost" onClick={() => void removeProduct(item.id)} aria-label="Eliminar produto acabado"><Trash2 className="text-destructive" /></Button></div></article>)}</div></div></div></main>
}
