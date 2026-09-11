import { NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"

export type SupportTask = {
  id: string
  product: string
  bagMeasure: string
  quantityToLabel: number
  quantityLabeled: number
  operatorId: string
  operatorName: string
  createdAt: string
}

const STORAGE_KEY = "support_tasks"

export async function GET() {
  const tasks = (await getData<SupportTask[]>(STORAGE_KEY)) ?? []
  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  const body = await request.json()
  const product = String(body.product ?? "").trim()
  const bagMeasure = String(body.bagMeasure ?? "").trim()
  const operatorId = String(body.operatorId ?? "").trim()
  const operatorName = String(body.operatorName ?? "").trim()
  const quantityToLabel = Number(body.quantityToLabel)
  const quantityLabeled = Number(body.quantityLabeled)

  if (!product || !bagMeasure || !operatorId || !operatorName || !Number.isFinite(quantityToLabel) || !Number.isFinite(quantityLabeled) || quantityToLabel < 0 || quantityLabeled < 0) {
    return NextResponse.json({ error: "Preencha todos os campos corretamente." }, { status: 400 })
  }

  const tasks = (await getData<SupportTask[]>(STORAGE_KEY)) ?? []
  const task: SupportTask = {
    id: crypto.randomUUID(),
    product,
    bagMeasure,
    quantityToLabel,
    quantityLabeled,
    operatorId,
    operatorName,
    createdAt: new Date().toISOString(),
  }

  const saved = await setData(STORAGE_KEY, [task, ...tasks])
  if (!saved) return NextResponse.json({ error: "Não foi possível guardar o registro." }, { status: 500 })
  return NextResponse.json(task, { status: 201 })
}
