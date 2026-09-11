import type { ShiftType } from "./types"

export const SHIFT_TIMES = {
  morning: { start: "08:00", end: "16:00", label: "Turno 1 (08:00-16:00)" },
  afternoon: { start: "16:00", end: "00:00", label: "Turno 2 (16:00-00:00)" },
} as const

export function getShiftLabel(shift: ShiftType): string {
  return SHIFT_TIMES[shift].label
}

export function getShiftShortLabel(shift: ShiftType): string {
  const labels = {
    morning: "Turno 1",
    afternoon: "Turno 2",
  }
  return labels[shift]
}

export function getCurrentShift(): { shift: ShiftType; label: string } {
  const now = new Date()
  const hour = now.getHours()

  if (hour >= 8 && hour < 16) {
    return { shift: "morning", label: SHIFT_TIMES.morning.label }
  }
  if (hour >= 16 || hour < 0) {
    return { shift: "afternoon", label: SHIFT_TIMES.afternoon.label }
  }
  return { shift: "afternoon", label: SHIFT_TIMES.afternoon.label }
}
