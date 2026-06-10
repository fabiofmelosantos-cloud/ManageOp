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
  targetQuantity: number // Total a produzir (kg)
  rpm?: number // Rotações por minuto
  kgPerHour?: number // Velocidade de produção kg/hora
  expectedPallets: number // Previsão de paletes
  // Campos legacy (mantidos para compatibilidade)
  lineCapacity?: number
  requestedKg?: number
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
  visibleLineIds?: string[] // IDs das linhas visíveis neste plano (se undefined, mostra todas)
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

// Coordinator Enhanced Types

export type LineStatus = "running" | "stopped" | "cleaning" | "incident" | "maintenance"
export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type AdherenceStatus = "on-track" | "at-risk" | "delayed"

export interface ManualAdherenceEntry {
  id: string
  lineId: string
  lineName: string
  productId?: string
  productName?: string
  producedKg: number
  remainingKg: number
  startTime: string
  currentTime: string
  lineRate: number // kg/hour
  targetKg: number
  status: AdherenceStatus
  estimatedEndTime?: string
  deviation?: number // percentage
}

export interface SafetyQualityRecord {
  id: string
  date: string
  shift: ShiftType
  safetyIncidents: number
  nearMisses: number
  qualityIssues: string
  complaints: string
  deviations: string
  observations: string
}

export interface CostDeliveryRecord {
  id: string
  date: string
  shift: ShiftType
  stoppages: StoppageRecord[]
  breakages: string
  materialShortage: string
  logisticsIssues: string
  linesBelowTarget: string[]
  observations: string
}

export interface StoppageRecord {
  id: string
  lineId: string
  lineName: string
  startTime: string
  endTime?: string
  duration: number // minutes
  reason: string
  category: "mechanical" | "electrical" | "material" | "quality" | "other"
}

export interface WorkforceRecord {
  id: string
  date: string
  shift: ShiftType
  missingOperators: number
  positionChanges: string
  reinforcements: string
  absences: AbsenceEntry[]
  observations: string
}

export interface AbsenceEntry {
  workerId: string
  workerName: string
  reason: string
  notified: boolean
}

export interface WorkforceDistribution {
  id: string
  workerId: string
  workerName: string
  lineId?: string
  lineName?: string
  laborCode: string
  laborCodeName: string
  hoursAssigned: number
  observations?: string
}

export interface LaborCode {
  code: string
  name: string
  description?: string
}

export const LABOR_CODES: LaborCode[] = [
  { code: "01", name: "MOD Escangalho", description: "Mao de obra direta escangalho" },
  { code: "02", name: "Coordenador", description: "Coordenador de turno" },
  { code: "05", name: "Suporte de Turno", description: "Suporte operacional de turno" },
  { code: "013", name: "Limpezas Periodicas", description: "Limpezas periodicas programadas" },
  { code: "035", name: "Incidencia Mecanica", description: "Paragem por incidencia mecanica" },
  { code: "036", name: "Pisao / Limpeza Exterior", description: "Trabalhos de pisao e limpeza exterior" },
]

export interface LineStatusEntry {
  lineId: string
  lineName: string
  status: LineStatus
  productionHours: number
  cleaningHours: number
  stoppedHours: number
  stoppageReason?: string
  incidentDescription?: string
  lastUpdate: string
  // New fields for workforce calculation
  productName?: string
  totalPeople: number
  qualityWallPeople: number // Muro Qualidade (041)
}

export interface ExtraPositionEntry {
  code: string
  name: string
  checked: boolean
  hours: number
}

export const EXTRA_POSITIONS: ExtraPositionEntry[] = [
  { code: "01", name: "Silos", checked: false, hours: 8 },
  { code: "036", name: "Pisao", checked: false, hours: 8 },
  { code: "036", name: "Residuos Exteriores", checked: false, hours: 8 },
  { code: "02", name: "Coordenador", checked: false, hours: 8 },
  { code: "01", name: "Armazem", checked: false, hours: 8 },
  { code: "013", name: "Limpeza Periodica", checked: false, hours: 8 },
]

export interface NotificationSummary {
  lines: {
    lineId: string
    lineName: string
    productName: string
    totalPeople: number
    productionPeople: number // total - qualityWall
    qualityWallPeople: number
    productionHours: number
    productionTotalHours: number // productionPeople × productionHours
    qualityWallTotalHours: number // qualityWallPeople × productionHours
  }[]
  extraPositions: {
    code: string
    name: string
    hours: number
  }[]
  grandTotal: {
    totalPeople: number
    totalHours: number
    byCode: Record<string, { code: string; name: string; hours: number; people: number }>
  }
}

export interface OperationalSummary {
  id: string
  date: string
  shift: ShiftType
  coordinatorName: string
  safetyQuality: SafetyQualityRecord
  costDelivery: CostDeliveryRecord
  workforce: WorkforceRecord
  lineStatuses: LineStatusEntry[]
  generatedText: string
  sapReadyText: string
  createdAt: string
}

export interface CoordinatorShiftReport {
  id: string
  date: string
  shift: ShiftType
  coordinatorId: string
  coordinatorName: string
  
  // Adherence data
  adherenceData: {
    mode: "automatic" | "manual"
    entries: ManualAdherenceEntry[]
    overallAdherence: number
  }
  
  // SQCD data
  safetyQuality: SafetyQualityRecord
  costDelivery: CostDeliveryRecord
  workforce: WorkforceRecord
  
  // Line statuses
  lineStatuses: LineStatusEntry[]
  
  // Workforce distribution
  workforceDistribution: WorkforceDistribution[]
  
  // Generated summaries
  operationalSummary: string
  sapSummary: string
  
  createdAt: string
  updatedAt: string
}
