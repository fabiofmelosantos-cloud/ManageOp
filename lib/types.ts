export type ShiftType = "morning" | "afternoon" | "night"

export type SchedulePattern = "5x2" | "4x2" | "5x2-fixed"

export interface Specialty {
  id: string
  name: string
  description?: string
}

export interface Worker {
  id: string
  name: string
  employeeId: string
  specialties: string[] // Mantido como specialties
  availableShifts: ShiftType[]
  schedulePattern: SchedulePattern
  email?: string
  phone?: string
  company?: string // Nome da empresa
  companyColor?: string // Cor da empresa (hex)
  createdAt: string
}

export interface Product {
  id: string
  name: string
  description?: string
}

export interface SpecialtyRequirement {
  specialtyId: string // Mantido como specialtyId
  quantity: number
  positions?: Array<{
    order: number
    name: string // Nome do posto (ex: "Amassador", "Embalador Principal")
  }>
}

export interface ProductionLineRequirement {
  productId: string
  workersNeeded: number
  requiredSpecialties: SpecialtyRequirement[] // Mantido como requiredSpecialties
}

export interface ProductionLine {
  id: string
  name: string
  description?: string
  rpm?: number // Adicionar campo RPM
  lineLoad?: number // Added lineLoad field for default carregamento value
  timeToLaminator?: number // Tempo em minutos entre linha e laminador/rotativa
  timeToPackaging?: number // Tempo em minutos entre laminador/rotativa e embalagem
  requirements: ProductionLineRequirement[]
  isActive: boolean
  createdAt: string
}

export interface ShiftAssignment {
  workerId: string
  productionLineId: string
  productId: string
  position: number // Ordem do posto (1, 2, 3...)
  positionName?: string // Nome do posto (ex: "Amassador", "Embalador Principal")
  isTraining?: boolean // Se o operador está em formação
}

export interface ScheduleDay {
  date: string
  shift: ShiftType
  assignments: ShiftAssignment[]
}

export interface Schedule {
  id: string
  name: string
  startDate: string
  endDate: string // adicionado campo endDate
  days: ScheduleDay[]
  unallocatedWorkers?: string[] // IDs dos trabalhadores não alocados
  createdAt: string
}

export interface ProductionPlanEntry {
  lineId: string
  productId: string | null
  targetQuantity: number // Quantidade a produzir (kg)
  lineCapacity: number // kg/hora
  expectedPallets: number
  requestedKg?: number // Total de kg pedidos (apenas no primeiro dia)
  kgPerHour?: number // Velocidade de produção kg/hora (apenas no primeiro dia)
}

export interface ShiftProductionPlan {
  shift: ShiftType
  entries: ProductionPlanEntry[]
}

export interface DailyProductionPlan {
  date: string // YYYY-MM-DD
  shifts: ShiftProductionPlan[] // Mudou de entries para shifts (3 turnos por dia)
}

export interface WeeklyProductionPlan {
  id: string
  name: string
  startDate: string // Segunda-feira
  days: DailyProductionPlan[] // 7 dias (segunda a domingo)
  createdAt: string
}

export interface ProductionTracking {
  planId: string
  lineId: string
  date: string
  startTime: string | null
  producedQuantity: number
  isRunning: boolean
}

export interface ScheduleGenerationConfig {
  startDate: string
  endDate: string // adicionado campo endDate
  shifts: ShiftType[]
}

export interface ScheduleConflict {
  type: "duplicate_position" | "multiple_shifts_same_day" | "shift_rotation_violation"
  severity: "error" | "warning"
  date: string
  shift?: ShiftType
  workerId?: string
  workerName?: string
  lineId?: string
  lineName?: string
  description: string
}

export interface ScheduleValidationResult {
  valid: boolean
  conflicts: ScheduleConflict[]
  warnings: ScheduleConflict[]
}

export interface AttendanceRecord {
  workerId: string
  workerName: string
  date: string
  shift: ShiftType
  lineId: string
  status: "present" | "absent" | "late"
  markedAt: string
  markedBy: string // Coordenador que marcou
  notes?: string
}

export interface LineAttendanceConfirmation {
  lineId: string
  lineName: string
  coordinatorName: string
  date: string
  shift: ShiftType
  confirmedAt: string
  attendance: AttendanceRecord[]
  notes?: string
}

export interface ShiftAttendanceReport {
  scheduleId: string
  date: string
  shift: ShiftType
  confirmations: LineAttendanceConfirmation[]
  allConfirmed: boolean
  hrNotificationSent: boolean
  createdAt: string
}

export interface ShiftReport {
  id: string
  lineId: string
  lineName: string
  coordinatorName: string
  date: string
  shift: ShiftType
  productId: string
  productName: string
  targetQuantity: number
  producedQuantity: number
  downtime: number // minutos parados
  quality: "excellent" | "good" | "acceptable" | "poor"
  wastePercentage: number
  issues: string
  observations: string
  createdAt: string
}

export interface LineProductionStats {
  lineId: string
  lineName: string
  dailyProduction: {
    date: string
    quantity: number
    downtime: number
    efficiency: number
    waste: number
  }[]
  weeklyTotal: number
  averageEfficiency: number
  totalDowntime: number
  totalWaste: number
}

export type UserRole = "admin" | "coordinator" | "operator"

export interface UserProfile {
  id: string
  name: string
  email: string
  employeeId: string
  role: UserRole
  createdAt: string
}
