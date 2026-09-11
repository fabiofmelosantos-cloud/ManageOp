import { NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"
import type { FinishedProduct } from "@/lib/types"

const STORAGE_KEY = "finished_products"

export async function GET() {
  return NextResponse.json((await getData<FinishedProduct[]>(STORAGE_KEY)) ?? [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const product = String(body.product ?? "").trim()
  const palletNumber = String(body.palletNumber ?? "").trim()
  const lot = String(body.lot ?? "").trim()
  const quantity = Number(body.quantity)
  const expiryDate = String(body.expiryDate ?? "").trim()
  const productionDate = String(body.productionDate ?? "").trim()

  if (!product || !palletNumber || !lot || !expiryDate || !productionDate || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Preencha todos os dados da produção." }, { status: 400 })
  }

  const item: FinishedProduct = {
    id: crypto.randomUUID(), palletNumber, product, quantity, unit: String(body.unit ?? "kg"), lot, expiryDate, productionDate,
    channel: "HQ", createdAt: new Date().toISOString(),
  }
  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  await setData(STORAGE_KEY, [item, ...items])
  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id ?? "")
  const items = (await getData<FinishedProduct[]>(STORAGE_KEY)) ?? []
  const item = items.find((entry) => entry.id === id)
  if (!item) return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 })

  const updated: FinishedProduct = body.action === "warehouse_validate"
    ? { ...item, warehouseValidatedAt: new Date().toISOString(), warehouseValidatedBy: String(body.validatedBy ?? "Armazém") }
    : body.action === "ship"
      ? { ...item, shippedAt: String(body.shippedAt ?? new Date().toISOString()), shippedQuantity: Number(body.shippedQuantity), shippedLot: String(body.shippedLot ?? ""), shippedPalletNumber: String(body.shippedPalletNumber ?? "") }
      : item

  if (body.action === "ship" && (!updated.warehouseValidatedAt || !updated.shippedQuantity || !updated.shippedLot || !updated.shippedPalletNumber)) {
    return NextResponse.json({ error: "A palete deve ser validada e a expedição preenchida." }, { status: 400 })
  }
  await setData(STORAGE_KEY, items.map((entry) => entry.id === id ? updated : entry))
  return NextResponse.json(updated)
}
