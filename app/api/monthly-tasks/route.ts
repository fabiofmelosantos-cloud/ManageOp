import { NextResponse } from "next/server"
import { getData, setData } from "@/lib/neon-client"

type MonthlyTask = { id: string; description: string; frequency: "daily" | "twice-weekly" }
type MonthlyPlan = { month: string; tasks: MonthlyTask[]; assignments: Record<string, Record<string, string>>; createdAt: string }
const STORAGE_KEY = "monthly-operator-tasks"

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? new Date().toISOString().slice(0, 7)
  const plans = (await getData<MonthlyPlan[]>(STORAGE_KEY)) ?? []
  return NextResponse.json(plans.find((plan) => plan.month === month) ?? null)
}

export async function PUT(request: Request) {
  const body = await request.json() as MonthlyPlan
  if (!body.month || !Array.isArray(body.tasks)) return NextResponse.json({ error: "Plano inválido." }, { status: 400 })
  const plans = (await getData<MonthlyPlan[]>(STORAGE_KEY)) ?? []
  const plan = { ...body, createdAt: new Date().toISOString() }
  const saved = await setData(STORAGE_KEY, [...plans.filter((item) => item.month !== body.month), plan])
  if (!saved) return NextResponse.json({ error: "Não foi possível guardar a escala." }, { status: 500 })
  return NextResponse.json(plan)
}
