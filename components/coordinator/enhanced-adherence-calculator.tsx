"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calculator,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Gauge,
} from "lucide-react"
import type { ManualAdherenceEntry, AdherenceStatus, ProductionLine, WeeklyProductionPlan, ShiftType } from "@/lib/types"

interface EnhancedAdherenceCalculatorProps {
  productionLines: ProductionLine[]
  weeklyPlan: WeeklyProductionPlan | null
  selectedDate: string
  selectedShift: ShiftType
  onAdherenceUpdate?: (entries: ManualAdherenceEntry[], overallAdherence: number) => void
}

export function EnhancedAdherenceCalculator({
  productionLines,
  weeklyPlan,
  selectedDate,
  selectedShift,
  onAdherenceUpdate,
}: EnhancedAdherenceCalculatorProps) {
  const [mode, setMode] = useState<"automatic" | "manual">("automatic")
  const [manualEntries, setManualEntries] = useState<ManualAdherenceEntry[]>([])
  const [currentTime, setCurrentTime] = useState(new Date().toISOString())

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Get plan data for automatic mode
  const getPlanData = () => {
    if (!weeklyPlan) return []

    const dayPlan = weeklyPlan.days.find((d) => d.date === selectedDate)
    if (!dayPlan) return []

    const shiftPlan = dayPlan.shifts.find((s) => s.shift === selectedShift)
    if (!shiftPlan) return []

    return shiftPlan.entries
      .filter((e) => e.targetQuantity > 0)
      .map((entry) => {
        const line = productionLines.find((l) => l.id === entry.lineId)
        const product = line?.requirements?.find((r) => r.productId === entry.productId)

        return {
          lineId: entry.lineId,
          lineName: line?.name || "Linha Desconhecida",
          productId: entry.productId,
          productName: product ? "Produto" : "N/A",
          targetKg: entry.targetQuantity,
          lineRate: entry.lineCapacity || entry.kgPerHour || 0,
          producedKg: 0, // Would come from tracking
          remainingKg: entry.targetQuantity,
        }
      })
  }

  const calculateStatus = (produced: number, target: number, rate: number): AdherenceStatus => {
    if (target <= 0) return "on-track"
    const percentage = (produced / target) * 100
    if (percentage >= 85) return "on-track"
    if (percentage >= 60) return "at-risk"
    return "delayed"
  }

  const calculateEstimatedEnd = (remaining: number, rate: number, startTime: string): string | undefined => {
    if (rate <= 0 || remaining <= 0) return undefined
    const hoursNeeded = remaining / rate
    const start = new Date(startTime)
    const end = new Date(start.getTime() + hoursNeeded * 60 * 60 * 1000)
    return end.toISOString()
  }

  const calculateDeviation = (produced: number, target: number): number => {
    if (target <= 0) return 0
    return ((produced - target) / target) * 100
  }

  const addManualEntry = () => {
    const newEntry: ManualAdherenceEntry = {
      id: `entry_${Date.now()}`,
      lineId: productionLines[0]?.id || "",
      lineName: productionLines[0]?.name || "",
      producedKg: 0,
      remainingKg: 0,
      startTime: new Date().toISOString(),
      currentTime: new Date().toISOString(),
      lineRate: 0,
      targetKg: 0,
      status: "on-track",
    }
    setManualEntries([...manualEntries, newEntry])
  }

  const updateManualEntry = (id: string, updates: Partial<ManualAdherenceEntry>) => {
    setManualEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry

        const updated = { ...entry, ...updates }
        
        // Recalculate derived fields
        updated.remainingKg = Math.max(0, updated.targetKg - updated.producedKg)
        updated.status = calculateStatus(updated.producedKg, updated.targetKg, updated.lineRate)
        updated.estimatedEndTime = calculateEstimatedEnd(updated.remainingKg, updated.lineRate, updated.startTime)
        updated.deviation = calculateDeviation(updated.producedKg, updated.targetKg)
        updated.currentTime = new Date().toISOString()

        return updated
      })
    )
  }

  const removeManualEntry = (id: string) => {
    setManualEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const getStatusBadge = (status: AdherenceStatus) => {
    switch (status) {
      case "on-track":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            No Objetivo
          </Badge>
        )
      case "at-risk":
        return (
          <Badge className="bg-yellow-600 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Risco
          </Badge>
        )
      case "delayed":
        return (
          <Badge className="bg-red-600 text-white">
            <TrendingDown className="h-3 w-3 mr-1" />
            Atraso
          </Badge>
        )
    }
  }

  const getStatusColor = (status: AdherenceStatus) => {
    switch (status) {
      case "on-track":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/30"
      case "at-risk":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
      case "delayed":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/30"
    }
  }

  const calculateOverallAdherence = () => {
    const entries = mode === "automatic" ? getPlanData() : manualEntries
    if (entries.length === 0) return 0

    const totalTarget = entries.reduce((sum, e) => sum + (e.targetKg || 0), 0)
    const totalProduced = entries.reduce((sum, e) => sum + (e.producedKg || 0), 0)

    if (totalTarget === 0) return 0
    return (totalProduced / totalTarget) * 100
  }

  const overallAdherence = calculateOverallAdherence()

  // Notify parent of changes
  useEffect(() => {
    if (onAdherenceUpdate) {
      onAdherenceUpdate(manualEntries, overallAdherence)
    }
  }, [manualEntries, overallAdherence, onAdherenceUpdate])

  const automaticEntries = getPlanData()

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Gauge className="h-5 w-5 text-blue-600" />
            Calculadora de Aderencia
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(currentTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setCurrentTime(new Date().toISOString())}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Adherence Display */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm opacity-90">Aderencia Global</p>
              <p className="text-3xl font-bold">{overallAdherence.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Estado</p>
              {overallAdherence >= 85 ? (
                <div className="flex items-center gap-1 text-green-200">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">Bom</span>
                </div>
              ) : overallAdherence >= 60 ? (
                <div className="flex items-center gap-1 text-yellow-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Atencao</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-200">
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-semibold">Critico</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 bg-white/20 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                overallAdherence >= 85 ? "bg-green-400" : overallAdherence >= 60 ? "bg-yellow-400" : "bg-red-400"
              }`}
              style={{ width: `${Math.min(overallAdherence, 100)}%` }}
            />
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "automatic" | "manual")}>
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="automatic" className="text-sm min-h-[44px]">
              <Calculator className="h-4 w-4 mr-2" />
              Automatico
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-sm min-h-[44px]">
              <Target className="h-4 w-4 mr-2" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-3 mt-4">
            {automaticEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sem plano carregado para este turno.</p>
                <p className="text-sm">Configure o plano semanal ou use o modo manual.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {automaticEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${getStatusColor(
                      calculateStatus(entry.producedKg, entry.targetKg, entry.lineRate)
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{entry.lineName}</span>
                      {getStatusBadge(calculateStatus(entry.producedKg, entry.targetKg, entry.lineRate))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Planeado</p>
                        <p className="font-semibold">{entry.targetKg} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Produzido</p>
                        <p className="font-semibold">{entry.producedKg} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Falta</p>
                        <p className="font-semibold">{entry.remainingKg} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Aderencia</p>
                        <p className="font-semibold">
                          {entry.targetKg > 0 ? ((entry.producedKg / entry.targetKg) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-4">
            <Button onClick={addManualEntry} className="w-full min-h-[48px]" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Linha
            </Button>

            {manualEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sem entradas manuais.</p>
                <p className="text-sm">Clique em &quot;Adicionar Linha&quot; para comecar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {manualEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border-l-4 space-y-3 ${getStatusColor(entry.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <Select
                        value={entry.lineId}
                        onValueChange={(value) => {
                          const line = productionLines.find((l) => l.id === value)
                          updateManualEntry(entry.id, {
                            lineId: value,
                            lineName: line?.name || "",
                          })
                        }}
                      >
                        <SelectTrigger className="w-[180px] min-h-[44px]">
                          <SelectValue placeholder="Selecionar Linha" />
                        </SelectTrigger>
                        <SelectContent>
                          {productionLines.map((line) => (
                            <SelectItem key={line.id} value={line.id}>
                              {line.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(entry.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualEntry(entry.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Kg Produzidos</Label>
                        <Input
                          type="number"
                          value={entry.producedKg || ""}
                          onChange={(e) => updateManualEntry(entry.id, { producedKg: Number(e.target.value) })}
                          className="min-h-[44px]"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Objetivo (kg)</Label>
                        <Input
                          type="number"
                          value={entry.targetKg || ""}
                          onChange={(e) => updateManualEntry(entry.id, { targetKg: Number(e.target.value) })}
                          className="min-h-[44px]"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Debito (kg/h)</Label>
                        <Input
                          type="number"
                          value={entry.lineRate || ""}
                          onChange={(e) => updateManualEntry(entry.id, { lineRate: Number(e.target.value) })}
                          className="min-h-[44px]"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hora Inicio</Label>
                        <Input
                          type="time"
                          value={entry.startTime ? new Date(entry.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : ""}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":")
                            const date = new Date(selectedDate)
                            date.setHours(parseInt(hours), parseInt(minutes))
                            updateManualEntry(entry.id, { startTime: date.toISOString() })
                          }}
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Em Falta</Label>
                        <div className="min-h-[44px] flex items-center px-3 bg-muted rounded-md font-semibold">
                          {entry.remainingKg.toFixed(0)} kg
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Previsao Fecho</Label>
                        <div className="min-h-[44px] flex items-center px-3 bg-muted rounded-md font-semibold text-sm">
                          {entry.estimatedEndTime
                            ? new Date(entry.estimatedEndTime).toLocaleTimeString("pt-PT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progresso</span>
                        <span>{entry.targetKg > 0 ? ((entry.producedKg / entry.targetKg) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            entry.status === "on-track"
                              ? "bg-green-500"
                              : entry.status === "at-risk"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(entry.targetKg > 0 ? (entry.producedKg / entry.targetKg) * 100 : 0, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {entry.deviation !== undefined && Math.abs(entry.deviation) > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Desvio:</span>
                        <span
                          className={`font-semibold ${
                            entry.deviation >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {entry.deviation >= 0 ? "+" : ""}
                          {entry.deviation.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
