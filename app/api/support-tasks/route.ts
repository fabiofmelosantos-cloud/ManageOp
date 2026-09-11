import { NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"

export type SupportTask = {
  id: string
  product: string
  bagMeasure: string
  internalCode: string
  quantityToLabel: number
  quantityLabeled: number
  operatorId: string
  operatorName: string
  createdAt: string
  completed: boolean
}

const STORAGE_KEY = "support_tasks"

export async function GET() {
  const tasks = (await getData<SupportTask[]>(STORAGE_KEY)) ?? []
  return NextResponse.json(tasks)
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const taskId = String(body.id ?? "").trim()
  if (!taskId) return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 })

  const tasks = (await getData<SupportTask[]>(STORAGE_KEY)) ?? []
  const task = tasks.find((item) => item.id === taskId)
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 })

  const hasExecutionUpdate = body.quantityLabeled !== undefined || body.operatorId !== undefined || body.operatorName !== undefined
  const updatedTask = hasExecutionUpdate
    ? { ...task, quantityLabeled: Number(body.quantityLabeled), operatorId: String(body.operatorId ?? ""), operatorName: String(body.operatorName ?? "") }
    : { ...task, completed: Boolean(body.completed) }
  const saved = await setData(STORAGE_KEY, tasks.map((item) => item.id === taskId ? updatedTask : item))
  if (!saved) return NextResponse.json({ error: "Não foi possível atualizar a tarefa." }, { status: 500 })
  return NextResponse.json(updatedTask)
}

export async function POST(request: Request) {
  const body = await request.json()
  const product = String(body.product ?? "").trim()
  const bagMeasure = String(body.bagMeasure ?? "").trim()
  const internalCode = String(body.internalCode ?? "").trim()
  const quantityToLabel = Number(body.quantityToLabel)

  if (!product || !bagMeasure || !internalCode || !Number.isFinite(quantityToLabel) || quantityToLabel < 0) {
    return NextResponse.json({ error: "Preencha todos os campos corretamente." }, { status: 400 })
  }

  const tasks = (await getData<SupportTask[]>(STORAGE_KEY)) ?? []
  const task: SupportTask = {
    id: crypto.randomUUID(),
    product,
    bagMeasure,
    internalCode,
    quantityToLabel,
    quantityLabeled: 0,
    operatorId: "",
    operatorName: "",
    createdAt: new Date().toISOString(),
    completed: false,
  }

  const saved = await setData(STORAGE_KEY, [task, ...tasks])
  if (!saved) return NextResponse.json({ error: "Não foi possível guardar o registro." }, { status: 500 })
  return NextResponse.json(task, { status: 201 })
}
