import { NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"
import type { FinishedProduct } from "@/lib/types"

const STORAGE_KEY = "finished_products"

function findDuplicatePallet(items: FinishedProduct[], palletNumber: string, excludeId?: string) {
  const normalized = palletNumber.trim().toLocaleLowerCase()
  return items.find((entry) => entry.id !== excludeId && entry.palletNumber.trim().toLocaleLowerCase() === normalized)
}

function duplicatePalletResponse(existing: FinishedProduct, channel: FinishedProduct["channel"]) {
  const message = existing.channel !== channel
    ? `Já existe a palete ${existing.palletNumber} registada como ${existing.channel} (esta produção indica ${channel}). Edite o registo existente para corrigir.`
    : `Já existe a palete ${existing.palletNumber} registada. Edite o registo existente ou corrija o número.`
  return NextResponse.json({ error: message, existingId: existing.id, existingChannel: existing.channel }, { status: 409 })
}

export async function GET() {
  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  return NextResponse.json(items.sort((a, b) => (b.shippedAt ?? b.createdAt).localeCompare(a.shippedAt ?? a.createdAt)))
}

export async function POST(request: Request) {
  const body = await request.json()
  const product = String(body.product ?? "").trim()
  const palletNumber = String(body.palletNumber ?? "").trim()
  const lot = String(body.lot ?? "").trim()
  const quantity = Number(body.quantity)
  const expiryDate = String(body.expiryDate ?? "").trim()
  const productionDate = String(body.productionDate ?? "").trim()
  const channel: FinishedProduct["channel"] = String(body.channel ?? "").trim() === "B2B" ? "B2B" : "HQ"

  if (!product || !palletNumber || !lot || !expiryDate || !productionDate || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Preencha todos os dados da produção." }, { status: 400 })
  }

  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  const duplicate = findDuplicatePallet(items, palletNumber)
  if (duplicate) return duplicatePalletResponse(duplicate, channel)

  const item: FinishedProduct = {
    id: crypto.randomUUID(), palletNumber, product, quantity, unit: "unidades", lot, expiryDate, productionDate,
    channel, createdAt: new Date().toISOString(),
  }
  await setData(STORAGE_KEY, [item, ...items])
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(request: Request) {
  const id = String(new URL(request.url).searchParams.get("id") ?? "")
  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  if (!items.some((item) => item.id === id)) return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 })
  await setData(STORAGE_KEY, items.filter((item) => item.id !== id))
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id ?? "")
  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  const item = items.find((entry) => entry.id === id)
  if (!item) return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 })

  if (body.action === "edit") {
    const product = String(body.product ?? "").trim()
    const palletNumber = String(body.palletNumber ?? "").trim()
    const lot = String(body.lot ?? "").trim()
    const quantity = Number(body.quantity)
    const expiryDate = String(body.expiryDate ?? "").trim()
    const productionDate = String(body.productionDate ?? "").trim()
    const channel: FinishedProduct["channel"] = String(body.channel ?? "").trim() === "B2B" ? "B2B" : "HQ"
    if (!product || !palletNumber || !lot || !expiryDate || !productionDate || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Preencha todos os dados da produção." }, { status: 400 })
    }
    const duplicate = findDuplicatePallet(items, palletNumber, id)
    if (duplicate) return duplicatePalletResponse(duplicate, channel)
    const edited: FinishedProduct = { ...item, product, palletNumber, lot, quantity, expiryDate, productionDate, channel }
    await setData(STORAGE_KEY, items.map((entry) => entry.id === id ? edited : entry))
    return NextResponse.json(edited)
  }

  const updated: FinishedProduct = body.action === "warehouse_validate"
    ? { ...item, warehouseValidatedAt: new Date().toISOString(), warehouseValidatedBy: String(body.validatedBy ?? "Armazém") }
    : body.action === "ship"
      ? { ...item, shippedAt: String(body.shippedAt ?? new Date().toISOString()), shippedQuantity: Number(body.shippedQuantity), shippedLot: String(body.shippedLot ?? ""), shippedPalletNumber: String(body.shippedPalletNumber ?? "") }
      : item

  const shippedQuantity = updated.shippedQuantity ?? 0
  if (body.action === "ship" && (!updated.warehouseValidatedAt || !Number.isFinite(shippedQuantity) || shippedQuantity <= 0 || !updated.shippedLot || !updated.shippedPalletNumber || shippedQuantity > item.quantity)) {
    return NextResponse.json({ error: "A palete deve ser validada e a expedição preenchida." }, { status: 400 })
  }
  await setData(STORAGE_KEY, items.map((entry) => entry.id === id ? updated : entry))
  return NextResponse.json(updated)
}
