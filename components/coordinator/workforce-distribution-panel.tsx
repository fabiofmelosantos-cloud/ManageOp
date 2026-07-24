"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Calculator,
  Download,
  Edit2,
  Check,
  X,
  Clock,
  Building2,
} from "lucide-react"
import type { WorkforceDistribution, Worker, ProductionLine, Schedule, ShiftType, LABOR_CODES } from "@/lib/types"

// Define labor codes locally for component use
const LABOR_CODE_OPTIONS = [
  { code: "01", name: "MOD Escangalho", description: "Mao de obra direta escangalho" },
  { code: "02", name: "Coordenador", description: "Coordenador de turno" },
  { code: "05", name: "Suporte de Turno", description: "Suporte operacional de turno" },
  { code: "013", name: "Limpezas Periodicas", description: "Limpezas periodicas programadas" },
  { code: "035", name: "Incidencia Mecanica", description: "Paragem por incidencia mecanica" },
  { code: "036", name: "Pisao / Limpeza Exterior", description: "Trabalhos de pisao e limpeza exterior" },
]

interface WorkforceDistributionPanelProps {
  workers: Worker[]
  productionLines: ProductionLine[]
  schedules: Schedule[]
  selectedDate: string
  selectedShift: ShiftType
  onDistributionUpdate?: (distribution: WorkforceDistribution[]) => void
}

export function WorkforceDistributionPanel({
  workers,
  productionLines,
  schedules,
  selectedDate,
  selectedShift,
  onDistributionUpdate,
}: WorkforceDistributionPanelProps) {
  const [distribution, setDistribution] = useState<WorkforceDistribution[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<WorkforceDistribution>>({})

  // Calculate initial distribution from schedule
  useEffect(() => {
    const allocatedWorkers = getWorkersFromSchedule()
    const initialDistribution = allocatedWorkers.map((w) => ({
      id: `dist_${w.id}_${Date.now()}`,
      workerId: w.id,
      workerName: w.name,
      lineId: w.lineId,
      lineName: w.lineName,
      laborCode: "01", // Default to MOD Escangalho
      laborCodeName: "MOD Escangalho",
      hoursAssigned: 8, // Default shift hours
      observations: "",
    }))
    setDistribution(initialDistribution)
  }, [workers, schedules, selectedDate, selectedShift])

  const getWorkersFromSchedule = () => {
    const allocated: Array<{ id: string; name: string; lineId: string; lineName: string }> = []

    schedules.forEach((schedule) => {
      schedule.days.forEach((day) => {
        if (day.date === selectedDate && day.shift === selectedShift) {
          day.assignments.forEach((assignment) => {
            const worker = workers.find((w) => w.id === assignment.workerId)
            const line = productionLines.find((l) => l.id === assignment.productionLineId)
            if (worker && !allocated.find((a) => a.id === worker.id)) {
              allocated.push({
                id: worker.id,
                name: worker.name,
                lineId: assignment.productionLineId,
                lineName: line?.name || "N/A",
              })
            }
          })
        }
      })
    })

    return allocated
  }

  const calculateTotalsByCode = () => {
    const totals: Record<string, { code: string; name: string; hours: number; count: number }> = {}

    distribution.forEach((d) => {
      if (!totals[d.laborCode]) {
        const codeInfo = LABOR_CODE_OPTIONS.find((c) => c.code === d.laborCode)
        totals[d.laborCode] = {
          code: d.laborCode,
          name: codeInfo?.name || d.laborCode,
          hours: 0,
          count: 0,
        }
      }
      totals[d.laborCode].hours += d.hoursAssigned
      totals[d.laborCode].count += 1
    })

    return Object.values(totals).sort((a, b) => a.code.localeCompare(b.code))
  }

  const startEditing = (item: WorkforceDistribution) => {
    setEditingId(item.id)
    setEditValues({
      laborCode: item.laborCode,
      hoursAssigned: item.hoursAssigned,
      observations: item.observations,
    })
  }

  const saveEditing = (id: string) => {
    setDistribution((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const codeInfo = LABOR_CODE_OPTIONS.find((c) => c.code === editValues.laborCode)
        return {
          ...d,
          laborCode: editValues.laborCode || d.laborCode,
          laborCodeName: codeInfo?.name || d.laborCodeName,
          hoursAssigned: editValues.hoursAssigned ?? d.hoursAssigned,
          observations: editValues.observations ?? d.observations,
        }
      })
    )
    setEditingId(null)
    setEditValues({})
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({})
  }

  const exportToCSV = () => {
    const headers = ["Nome", "Linha", "Codigo", "Descricao", "Horas", "Observacoes"]
    const rows = distribution.map((d) => [
      d.workerName,
      d.lineName || "-",
      d.laborCode,
      d.laborCodeName,
      d.hoursAssigned.toString(),
      d.observations || "",
    ])

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `distribuicao_mod_${selectedDate}_${selectedShift}.csv`
    link.click()
  }

  // Notify parent of changes
  useEffect(() => {
    if (onDistributionUpdate) {
      onDistributionUpdate(distribution)
    }
  }, [distribution, onDistributionUpdate])

  const totals = calculateTotalsByCode()
  const totalHours = distribution.reduce((sum, d) => sum + d.hoursAssigned, 0)

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5 text-purple-600" />
            Distribuicao de Horas Homem (MOD)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              <Clock className="h-3 w-3 mr-1" />
              {totalHours}h Total
            </Badge>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="min-h-[36px]">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary by Code */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LABOR_CODE_OPTIONS.map((codeOption) => {
            const total = totals.find((t) => t.code === codeOption.code)
            return (
              <div
                key={codeOption.code}
                className={`p-3 rounded-lg border-2 transition-all ${
                  total ? "border-purple-300 bg-purple-50 dark:bg-purple-950/30" : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {codeOption.code}
                  </Badge>
                  {total && (
                    <span className="text-xs text-muted-foreground">{total.count}p</span>
                  )}
                </div>
                <p className="text-xs font-medium truncate" title={codeOption.name}>
                  {codeOption.name}
                </p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {total?.hours || 0}h
                </p>
              </div>
            )
          })}
        </div>

        {/* Workers Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">Linha</TableHead>
                  <TableHead className="font-semibold">Codigo</TableHead>
                  <TableHead className="font-semibold text-center">Horas</TableHead>
                  <TableHead className="font-semibold">Obs.</TableHead>
                  <TableHead className="font-semibold text-center w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distribution.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Sem trabalhadores alocados neste turno.</p>
                      <p className="text-sm">Verifique o plano de escalas.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  distribution.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                              {item.workerName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-sm">{item.workerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {item.lineName || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Select
                            value={editValues.laborCode || item.laborCode}
                            onValueChange={(v) => setEditValues({ ...editValues, laborCode: v })}
                          >
                            <SelectTrigger className="w-[120px] min-h-[40px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LABOR_CODE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.code} value={opt.code}>
                                  <span className="font-mono mr-2">{opt.code}</span>
                                  <span className="text-xs text-muted-foreground">{opt.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="font-mono">
                            {item.laborCode}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            value={editValues.hoursAssigned ?? item.hoursAssigned}
                            onChange={(e) =>
                              setEditValues({ ...editValues, hoursAssigned: Number(e.target.value) })
                            }
                            className="w-[80px] min-h-[40px] text-center"
                          />
                        ) : (
                          <span className="font-semibold">{item.hoursAssigned}h</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            value={editValues.observations ?? item.observations}
                            onChange={(e) => setEditValues({ ...editValues, observations: e.target.value })}
                            placeholder="Observacoes..."
                            className="min-h-[40px] text-sm"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.observations || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {editingId === item.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveEditing(item.id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals Summary */}
        {totals.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-5 w-5 text-purple-600" />
              <span className="font-semibold">Resumo por Codigo</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {totals.map((total) => (
                <div
                  key={total.code}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                >
                  <Badge className="font-mono bg-purple-600">{total.code}</Badge>
                  <span className="text-sm">{total.name}:</span>
                  <span className="font-bold">{total.hours}h</span>
                  <span className="text-xs text-muted-foreground">({total.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
