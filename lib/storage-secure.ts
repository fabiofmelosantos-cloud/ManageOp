"use client"

import type {
  Worker,
  ProductionLine,
  Product,
  Schedule,
  WeeklyProductionPlan,
  ProductionTracking,
  Specialty,
} from "./types"
import { getSupabase } from "./supabase-client"

// Cache in-memory para performance
const cache: {
  workers: Worker[] | null
  productionLines: ProductionLine[] | null
  specialties: Specialty[] | null
  schedules: Schedule[] | null
  weeklyPlans: WeeklyProductionPlan[] | null
  products: Product[] | null
  productionTracking: ProductionTracking[] | null
  shiftReports: any[] | null
} = {
  workers: null,
  productionLines: null,
  specialties: null,
  schedules: null,
  weeklyPlans: null,
  products: null,
  productionTracking: null,
  shiftReports: null,
}

// Workers - Usa tabela workers real
export function getWorkers(): Worker[] {
  return cache.workers || []
}

export async function loadWorkers(): Promise<Worker[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("workers").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Erro ao carregar workers:", error)
    return []
  }

  cache.workers = data || []
  return cache.workers
}

export async function addWorker(worker: Omit<Worker, "id" | "createdAt">): Promise<Worker> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const newWorker = {
    ...worker,
    created_by: user?.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("workers").insert([newWorker]).select().single()

  if (error) {
    console.error("[v0] Erro ao adicionar worker:", error)
    throw error
  }

  await loadWorkers() // Recarregar cache
  return data
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("workers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[v0] Erro ao atualizar worker:", error)
    return null
  }

  await loadWorkers() // Recarregar cache
  return data
}

export async function deleteWorker(id: string): Promise<boolean> {
  const supabase = getSupabase()

  const { error } = await supabase.from("workers").delete().eq("id", id)

  if (error) {
    console.error("[v0] Erro ao deletar worker:", error)
    return false
  }

  await loadWorkers() // Recarregar cache
  return true
}

export async function saveWorkers(workers: Worker[]): Promise<void> {
  // Esta função é mantida para compatibilidade mas não recomendada
  console.warn("[v0] saveWorkers em lote não recomendado. Use addWorker/updateWorker individual")
}

// Production Lines - Usa tabela production_lines real
export function getProductionLines(): ProductionLine[] {
  return cache.productionLines || []
}

export async function loadProductionLines(): Promise<ProductionLine[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("production_lines").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Erro ao carregar production_lines:", error)
    return []
  }

  const linesWithDefaults = (data || []).map((line: any) => ({
    ...line,
    isActive: line.is_active ?? true,
  }))

  cache.productionLines = linesWithDefaults
  return cache.productionLines
}

export async function addProductionLine(line: Omit<ProductionLine, "id" | "createdAt">): Promise<ProductionLine> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const newLine = {
    name: line.name,
    description: line.description,
    is_active: line.isActive ?? true,
    created_by: user?.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("production_lines").insert([newLine]).select().single()

  if (error) {
    console.error("[v0] Erro ao adicionar production_line:", error)
    throw error
  }

  await loadProductionLines()
  return { ...data, isActive: data.is_active }
}

export async function updateProductionLine(
  id: string,
  updates: Partial<ProductionLine>,
): Promise<ProductionLine | null> {
  const supabase = getSupabase()

  const dbUpdates: any = {
    updated_at: new Date().toISOString(),
  }
  if (updates.name) dbUpdates.name = updates.name
  if (updates.description) dbUpdates.description = updates.description
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive

  const { data, error } = await supabase.from("production_lines").update(dbUpdates).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Erro ao atualizar production_line:", error)
    return null
  }

  await loadProductionLines()
  return { ...data, isActive: data.is_active }
}

export async function deleteProductionLine(id: string): Promise<boolean> {
  const supabase = getSupabase()

  const { error } = await supabase.from("production_lines").delete().eq("id", id)

  if (error) {
    console.error("[v0] Erro ao deletar production_line:", error)
    return false
  }

  await loadProductionLines()
  return true
}

export async function saveProductionLines(lines: ProductionLine[]): Promise<void> {
  console.warn("[v0] saveProductionLines em lote não recomendado")
}

// Specialties
export function getSpecialties(): Specialty[] {
  return cache.specialties || []
}

export async function loadSpecialties(): Promise<Specialty[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("specialties").select("*").order("name", { ascending: true })

  if (error) {
    console.error("[v0] Erro ao carregar specialties:", error)
    return []
  }

  cache.specialties = data || []
  return cache.specialties
}

export async function addSpecialty(specialty: Omit<Specialty, "id">): Promise<Specialty> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("specialties")
    .insert([{ name: specialty.name, description: specialty.description }])
    .select()
    .single()

  if (error) {
    console.error("[v0] Erro ao adicionar specialty:", error)
    throw error
  }

  await loadSpecialties()
  return data
}

export async function deleteSpecialty(id: string): Promise<boolean> {
  const supabase = getSupabase()

  const { error } = await supabase.from("specialties").delete().eq("id", id)

  if (error) {
    console.error("[v0] Erro ao deletar specialty:", error)
    return false
  }

  await loadSpecialties()
  return true
}

export async function saveSpecialties(specialties: Specialty[]): Promise<void> {
  console.warn("[v0] saveSpecialties em lote não recomendado")
}

export const getWorkPositions = getSpecialties
export const loadWorkPositions = loadSpecialties
export const addWorkPosition = addSpecialty
export const deleteWorkPosition = deleteSpecialty
export const saveWorkPositions = saveSpecialties

// Products
export function getProducts(): Product[] {
  return cache.products || []
}

export async function loadProducts(): Promise<Product[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true })

  if (error) {
    console.error("[v0] Erro ao carregar products:", error)
    return []
  }

  cache.products = data || []
  return cache.products
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("products")
    .insert([{ name: product.name, description: product.description }])
    .select()
    .single()

  if (error) {
    console.error("[v0] Erro ao adicionar product:", error)
    throw error
  }

  await loadProducts()
  return data
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabase()

  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    console.error("[v0] Erro ao deletar product:", error)
    return false
  }

  await loadProducts()
  return true
}

export async function saveProducts(products: Product[]): Promise<void> {
  console.warn("[v0] saveProducts em lote não recomendado")
}

// Manter funções antigas que ainda usam app_storage temporariamente
// para não quebrar a aplicação durante migração
export function getSchedules(): Schedule[] {
  return cache.schedules || []
}

export async function loadSchedules(): Promise<Schedule[]> {
  // Temporariamente ainda usa app_storage
  const { getData } = await import("./supabase-simple")
  const schedules = (await getData<Schedule[]>("schedules")) || []
  cache.schedules = schedules
  return schedules
}

export async function addSchedule(schedule: Omit<Schedule, "id" | "createdAt">): Promise<Schedule> {
  const schedules = await loadSchedules()
  const newSchedule: Schedule = {
    ...schedule,
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  schedules.push(newSchedule)
  cache.schedules = schedules
  const { setData } = await import("./supabase-simple")
  await setData("schedules", schedules)
  return newSchedule
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule | null> {
  const schedules = await loadSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return null

  schedules[index] = { ...schedules[index], ...updates }
  cache.schedules = schedules
  const { setData } = await import("./supabase-simple")
  await setData("schedules", schedules)
  return schedules[index]
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const schedules = await loadSchedules()
  const filtered = schedules.filter((s) => s.id !== id)
  cache.schedules = filtered
  const { setData } = await import("./supabase-simple")
  await setData("schedules", filtered)
  return true
}

export async function saveSchedules(schedules: Schedule[]): Promise<void> {
  cache.schedules = schedules
  const { setData } = await import("./supabase-simple")
  await setData("schedules", schedules)
}

// Funções de weekly plans, tracking e reports mantém implementação antiga
// por enquanto (podem ser migradas depois)
export const getWeeklyProductionPlans = () => cache.weeklyPlans || []
export const getProductionTracking = () => cache.productionTracking || []
export const getShiftReports = () => cache.shiftReports || []
export const getWeeklyPlans = () => cache.weeklyPlans || []
export const getLatestWeeklyPlan = () => {
  const plans = getWeeklyPlans()
  return plans.length > 0 ? plans[plans.length - 1] : null
}

export async function loadWeeklyPlans(): Promise<WeeklyProductionPlan[]> {
  const { getData } = await import("./supabase-simple")
  const plans = (await getData<WeeklyProductionPlan[]>("weekly_plans")) || []
  cache.weeklyPlans = plans
  return plans
}

export async function addWeeklyPlan(
  plan: Omit<WeeklyProductionPlan, "id" | "createdAt">,
): Promise<WeeklyProductionPlan> {
  const plans = await loadWeeklyPlans()
  const newPlan: WeeklyProductionPlan = {
    ...plan,
    id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  plans.push(newPlan)
  cache.weeklyPlans = plans
  const { setData } = await import("./supabase-simple")
  await setData("weekly_plans", plans)
  return newPlan
}

export async function updateWeeklyPlan(
  id: string,
  updates: Partial<WeeklyProductionPlan>,
): Promise<WeeklyProductionPlan | null> {
  const plans = await loadWeeklyPlans()
  const index = plans.findIndex((p) => p.id === id)
  if (index === -1) return null

  plans[index] = { ...plans[index], ...updates }
  cache.weeklyPlans = plans
  const { setData } = await import("./supabase-simple")
  await setData("weekly_plans", plans)
  return plans[index]
}

export async function deleteWeeklyPlan(id: string): Promise<boolean> {
  const plans = await loadWeeklyPlans()
  const filtered = plans.filter((p) => p.id !== id)
  cache.weeklyPlans = filtered
  const { setData } = await import("./supabase-simple")
  await setData("weekly_plans", filtered)
  return true
}

export async function saveWeeklyPlans(plans: WeeklyProductionPlan[]): Promise<void> {
  cache.weeklyPlans = plans
  const { setData } = await import("./supabase-simple")
  await setData("weekly_plans", plans)
}

export async function loadProductionTracking(): Promise<ProductionTracking[]> {
  const { getData } = await import("./supabase-simple")
  const tracking = (await getData<ProductionTracking[]>("production_tracking")) || []
  cache.productionTracking = tracking
  return tracking
}

export async function updateProductionTracking(
  planId: string,
  lineId: string,
  date: string,
  updates: Partial<ProductionTracking>,
): Promise<ProductionTracking> {
  const trackingList = await loadProductionTracking()
  const index = trackingList.findIndex((t) => t.planId === planId && t.lineId === lineId && t.date === date)

  const tracking: ProductionTracking = {
    planId,
    lineId,
    date,
    producedQuantity: 0,
    isRunning: false,
    ...updates,
  }

  if (index >= 0) {
    trackingList[index] = tracking
  } else {
    trackingList.push(tracking)
  }

  cache.productionTracking = trackingList
  const { setData } = await import("./supabase-simple")
  await setData("production_tracking", trackingList)
  return tracking
}

export async function saveProductionTracking(tracking: ProductionTracking[]): Promise<void> {
  cache.productionTracking = tracking
  const { setData } = await import("./supabase-simple")
  await setData("production_tracking", tracking)
}

export async function loadShiftReports(): Promise<any[]> {
  const { getData } = await import("./supabase-simple")
  const reports = (await getData<any[]>("shift_reports")) || []
  cache.shiftReports = reports
  return reports
}

export async function addShiftReport(report: any): Promise<any> {
  const reports = await loadShiftReports()
  const newReport = {
    ...report,
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  reports.push(newReport)
  cache.shiftReports = reports
  const { setData } = await import("./supabase-simple")
  await setData("shift_reports", reports)
  return newReport
}

export async function saveShiftReports(reports: any[]): Promise<void> {
  cache.shiftReports = reports
  const { setData } = await import("./supabase-simple")
  await setData("shift_reports", reports)
}

export function getLineStats(lineId?: string) {
  const tracking = getProductionTracking()
  const reports = getShiftReports()

  const filteredTracking = lineId ? tracking.filter((t) => t.lineId === lineId) : tracking
  const filteredReports = lineId ? reports.filter((r: any) => r.lineId === lineId) : reports

  const totalProduced = filteredTracking.reduce((sum, t) => sum + (t.producedQuantity || 0), 0)
  const dailyProduction = filteredTracking.map((t) => ({
    date: t.date,
    produced: t.producedQuantity || 0,
  }))

  return {
    lineId: lineId || "",
    lineName: "",
    totalProduced,
    dailyProduction,
    reports: filteredReports,
  }
}
