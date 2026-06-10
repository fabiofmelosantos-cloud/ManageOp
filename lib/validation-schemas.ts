// Schemas Zod para validação de dados
// Garante que apenas dados válidos são salvos no banco

import { z } from "zod"

// Validação para Workers
export const workerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  employeeNumber: z
    .string()
    .min(1, "Número de colaborador obrigatório")
    .max(20, "Número muito longo")
    .regex(/^[0-9]+$/, "Número deve conter apenas dígitos"),
  specialties: z.array(z.string().uuid()).min(1, "Selecione pelo menos uma especialidade"),
  shifts: z.array(z.enum(["Manhã", "Tarde", "Noite"])).min(1, "Selecione pelo menos um turno"),
  company: z.string().max(50, "Nome da empresa muito longo").optional(),
  companyColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida")
    .optional(),
  active: z.boolean().default(true),
})

// Validação para Production Lines
export const productionLineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50, "Nome muito longo"),
  rpm: z.number().min(0, "RPM não pode ser negativo").max(10000, "RPM muito alto").optional(),
  products: z.array(z.string().uuid()).min(1, "Adicione pelo menos um produto"),
  requiredSpecialties: z.array(
    z.object({
      specialtyId: z.string().uuid(),
      count: z.number().min(1).max(50),
      positions: z.array(
        z.object({
          name: z.string().min(1).max(50),
          order: z.number().min(0),
        }),
      ),
    }),
  ),
  active: z.boolean().default(true),
})

// Validação para Schedules
export const scheduleSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Data inválida",
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Data inválida",
    }),
    shiftAssignments: z.array(
      z.object({
        workerId: z.string().uuid(),
        productionLineId: z.string().uuid(),
        shift: z.enum(["Manhã", "Tarde", "Noite"]),
        date: z.string(),
        positionName: z.string().optional(),
        isTraining: z.boolean().optional(),
      }),
    ),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "Data final deve ser maior ou igual à data inicial",
    path: ["endDate"],
  })

// Validação para Attendance
export const attendanceSchema = z.object({
  workerId: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data inválida",
  }),
  shift: z.enum(["Manhã", "Tarde", "Noite"]),
  status: z.enum(["present", "absent", "late"]),
  productionLineId: z.string().uuid(),
  notes: z.string().max(500, "Notas muito longas").optional(),
})

// Validação para User Profile
export const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  employeeNumber: z.string().min(1, "Número de colaborador obrigatório").max(20, "Número muito longo"),
  email: z.string().email("Email inválido").optional(),
  role: z.enum(["ADMIN", "COORDENADOR", "RH", "OPERADOR"]).default("OPERADOR"),
})

// Tipo inferido dos schemas
export type WorkerInput = z.infer<typeof workerSchema>
export type ProductionLineInput = z.infer<typeof productionLineSchema>
export type ScheduleInput = z.infer<typeof scheduleSchema>
export type AttendanceInput = z.infer<typeof attendanceSchema>
export type ProfileInput = z.infer<typeof profileSchema>
