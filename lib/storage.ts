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
  generatedTasks: import("./types").GeneratedTask[] | null
} = {
  workers: null,
  productionLines: null,
  specialties: null,
  schedules: null,
  weeklyPlans: null,
  products: null,
  productionTracking: null,
  shiftReports: null,
  generatedTasks: null,
}

async function readFromNeon<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const response = await fetch(`/api/data?key=${encodeURIComponent(key)}`)
    if (!response.ok) {
      console.error(`[Storage] Failed to read ${key}:`, response.statusText)
      return defaultValue
    }
    const { data } = await response.json()
    return data || defaultValue
  } catch (error) {
    console.error(`[Storage] Error reading ${key}:`, error)
    return defaultValue
  }
}

async function writeToNeon<T>(key: string, data: T): Promise<void> {
  try {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: data }),
    })
    if (!response.ok) {
      console.error(`[Storage] Failed to write ${key}:`, response.statusText)
    }
  } catch (error) {
    console.error(`[Storage] Error writing ${key}:`, error)
  }
}

export function getWorkers(): Worker[] {
  return cache.workers || []
}

export async function loadWorkers(): Promise<Worker[]> {
  const workers = await readFromNeon<Worker[]>("workers", [])
  cache.workers = workers
  return workers
}

export async function addWorker(worker: Omit<Worker, "id" | "createdAt">): Promise<Worker> {
  const workers = await loadWorkers()
  const newWorker: Worker = {
    ...worker,
    id: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  workers.push(newWorker)
  cache.workers = workers
  await writeToNeon("workers", workers)
  return newWorker
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | null> {
  const workers = await loadWorkers()
  const index = workers.findIndex((w) => w.id === id)
  if (index === -1) return null

  workers[index] = { ...workers[index], ...updates }
  cache.workers = workers
  await writeToNeon("workers", workers)
  return workers[index]
}

export async function deleteWorker(id: string): Promise<boolean> {
  const workers = await loadWorkers()
  const filtered = workers.filter((w) => w.id !== id)
  cache.workers = filtered
  await writeToNeon("workers", filtered)
  return true
}

export async function saveWorkers(workers: Worker[]): Promise<void> {
  cache.workers = workers
  await writeToNeon("workers", workers)
}

export function getProductionLines(): ProductionLine[] {
  return cache.productionLines || []
}

export async function loadProductionLines(): Promise<ProductionLine[]> {
  const lines = await readFromNeon<ProductionLine[]>("production_lines", [])
  const linesWithDefaults = lines.map((line) => ({
    ...line,
    isActive: line.isActive ?? true,
    rpm: line.rpm ?? 0,
    lineLoad: line.lineLoad ?? 0,
    timeToLaminator: line.timeToLaminator ?? 0,
    timeToPackaging: line.timeToPackaging ?? 0,
  }))
  cache.productionLines = linesWithDefaults
  return linesWithDefaults
}

export async function addProductionLine(line: Omit<ProductionLine, "id" | "createdAt">): Promise<ProductionLine> {
  const lines = await loadProductionLines()
  const newLine: ProductionLine = {
    ...line,
    id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  lines.push(newLine)
  cache.productionLines = lines
  await writeToNeon("production_lines", lines)
  return newLine
}

export async function updateProductionLine(
  id: string,
  updates: Partial<ProductionLine>,
): Promise<ProductionLine | null> {
  const lines = await loadProductionLines()
  const index = lines.findIndex((l) => l.id === id)
  if (index === -1) return null

  lines[index] = { ...lines[index], ...updates }
  cache.productionLines = lines
  await writeToNeon("production_lines", lines)
  return lines[index]
}

export async function deleteProductionLine(id: string): Promise<boolean> {
  const lines = await loadProductionLines()
  const filtered = lines.filter((l) => l.id !== id)
  cache.productionLines = filtered
  await writeToNeon("production_lines", filtered)
  return true
}

export async function saveProductionLines(lines: ProductionLine[]): Promise<void> {
  cache.productionLines = lines
  await writeToNeon("production_lines", lines)
}

export function getSpecialties(): Specialty[] {
  return cache.specialties || []
}

export async function loadSpecialties(): Promise<Specialty[]> {
  const specialties = await readFromNeon<Specialty[]>("specialties", [])
  cache.specialties = specialties
  return specialties
}

export async function addSpecialty(specialty: Omit<Specialty, "id">): Promise<Specialty> {
  const specialties = await loadSpecialties()
  const newSpecialty: Specialty = {
    ...specialty,
    id: `specialty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
  specialties.push(newSpecialty)
  cache.specialties = specialties
  await writeToNeon("specialties", specialties)
  return newSpecialty
}

export async function deleteSpecialty(id: string): Promise<boolean> {
  const specialties = await loadSpecialties()
  const filtered = specialties.filter((s) => s.id !== id)
  cache.specialties = filtered
  await writeToNeon("specialties", filtered)
  return true
}

export async function saveSpecialties(specialties: Specialty[]): Promise<void> {
  cache.specialties = specialties
  await writeToNeon("specialties", specialties)
}

export const getWorkPositions = getSpecialties
export const loadWorkPositions = loadSpecialties
export const addWorkPosition = addSpecialty
export const deleteWorkPosition = deleteSpecialty
export const saveWorkPositions = saveSpecialties

export function getProducts(): Product[] {
  return cache.products || []
}

export async function loadProducts(): Promise<Product[]> {
  const products = await readFromNeon<Product[]>("products", [])
  cache.products = products
  return products
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const products = await loadProducts()
  const newProduct: Product = {
    ...product,
    id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
  products.push(newProduct)
  cache.products = products
  await writeToNeon("products", products)
  return newProduct
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await loadProducts()
  const filtered = products.filter((p) => p.id !== id)
  cache.products = filtered
  await writeToNeon("products", filtered)
  return true
}

export async function saveProducts(products: Product[]): Promise<void> {
  cache.products = products
  await writeToNeon("products", products)
}

export function getGeneratedTasks(): import("./types").GeneratedTask[] {
  return cache.generatedTasks || []
}

export async function loadGeneratedTasks(): Promise<import("./types").GeneratedTask[]> {
  const tasks = await readFromNeon<import("./types").GeneratedTask[]>("generated_tasks", [])
  cache.generatedTasks = tasks
  return tasks
}

export async function saveGeneratedTasks(tasks: import("./types").GeneratedTask[]): Promise<void> {
  cache.generatedTasks = tasks
  await writeToNeon("generated_tasks", tasks)
}

export function getSchedules(): Schedule[] {
  return cache.schedules || []
}

export async function loadSchedules(): Promise<Schedule[]> {
  const schedules = await readFromNeon<Schedule[]>("schedules", [])
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
  await writeToNeon("schedules", schedules)
  return newSchedule
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule | null> {
  const schedules = await loadSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return null

  schedules[index] = { ...schedules[index], ...updates }
  cache.schedules = schedules
  await writeToNeon("schedules", schedules)
  return schedules[index]
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const schedules = await loadSchedules()
  const filtered = schedules.filter((s) => s.id !== id)
  cache.schedules = filtered
  await writeToNeon("schedules", filtered)
  return true
}

export async function saveSchedules(schedules: Schedule[]): Promise<void> {
  cache.schedules = schedules
  await writeToNeon("schedules", schedules)
}

export function getWeeklyPlans(): WeeklyProductionPlan[] {
  return cache.weeklyPlans || []
}

export async function loadWeeklyPlans(): Promise<WeeklyProductionPlan[]> {
  const plans = await readFromNeon<WeeklyProductionPlan[]>("weekly_plans", [])
  cache.weeklyPlans = plans
  return plans
}

export function getLatestWeeklyPlan(): WeeklyProductionPlan | null {
  const plans = getWeeklyPlans()
  return plans.length > 0 ? plans[plans.length - 1] : null
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
  await writeToNeon("weekly_plans", plans)
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
  await writeToNeon("weekly_plans", plans)
  return plans[index]
}

export async function deleteWeeklyPlan(id: string): Promise<boolean> {
  const plans = await loadWeeklyPlans()
  const filtered = plans.filter((p) => p.id !== id)
  cache.weeklyPlans = filtered
  await writeToNeon("weekly_plans", filtered)
  return true
}

export async function saveWeeklyPlans(plans: WeeklyProductionPlan[]): Promise<void> {
  cache.weeklyPlans = plans
  await writeToNeon("weekly_plans", plans)
}

export const getWeeklyProductionPlans = getWeeklyPlans

export function getProductionTracking(): ProductionTracking[] {
  return cache.productionTracking || []
}

export async function loadProductionTracking(): Promise<ProductionTracking[]> {
  const tracking = await readFromNeon<ProductionTracking[]>("production_tracking", [])
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
  await writeToNeon("production_tracking", trackingList)
  return tracking
}

export async function saveProductionTracking(tracking: ProductionTracking[]): Promise<void> {
  cache.productionTracking = tracking
  await writeToNeon("production_tracking", tracking)
}

export function getShiftReports(): any[] {
  return cache.shiftReports || []
}

export async function loadShiftReports(): Promise<any[]> {
  const reports = await readFromNeon<any[]>("shift_reports", [])
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
  await writeToNeon("shift_reports", reports)
  return newReport
}

export async function saveShiftReports(reports: any[]): Promise<void> {
  cache.shiftReports = reports
  await writeToNeon("shift_reports", reports)
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
