"use client"

import { useState, useEffect, useCallback } from "react"
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
  Play,
  Pause,
  Square,
} from "lucide-react"
import type { ManualAdherenceEntry, AdherenceStatus, ProductionLine, WeeklyProductionPlan, ShiftType } from "@/lib/types"

interface EnhancedAdherenceCalculatorProps {
  productionLines: ProductionLine[]
  weeklyPlan: WeeklyProductionPlan | null
  selectedDate: string
  selectedShift: ShiftType
  manualEntries: ManualAdherenceEntry[]
  onManualEntriesChange: (entries: ManualAdherenceEntry[]) => void
  onAdherenceUpdate?: (entries: ManualAdherenceEntry[], overallAdherence: number) => void
}

// Compute the live produced kg for a running entry.
function getLiveProducedKg(entry: ManualAdherenceEntry, now: number): number {
  if (entry.isRunning && entry.trackingStartTime && entry.lineRate > 0) {
    const baseline = entry.baselineKg ?? 0
    const elapsedHours = (now - new Date(entry.trackingStartTime).getTime()) / (1000 * 60 * 60)
    return Math.max(0, baseline + entry.lineRate * elapsedHours)
  }
  return entry.producedKg
}

export function EnhancedAdherenceCalculator({
  productionLines,
  weeklyPlan,
  selectedDate,
  selectedShift,
  manualEntries,
  onManualEntriesChange,
  onAdherenceUpdate,
}: EnhancedAdherenceCalculatorProps) {
  const [mode, setMode] = useState<"automatic" | "manual">("manual")
  const [now, setNow] = useState(Date.now())

  // Tick every second so running counters update in real time.
  useEffect(() => {
    const hasRunning = manualEntries.some((e) => e.isRunning)
    if (!hasRunning) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [manualEntries])

  const calculateStatus = (produced: number, target: number): AdherenceStatus => {
    if (target <= 0) return "on-track"
    const percentage = (produced / target) * 100
    if (percentage >= 85) return "on-track"
    if (percentage >= 60) return "at-risk"
    return "delayed"
  }

  const calculateEstimatedEnd = (remaining: number, rate: number, fromTime: number): string | undefined => {
    if (rate <= 0 || remaining <= 0) return undefined
    const hoursNeeded = remaining / rate
    const end = new Date(fromTime + hoursNeeded * 60 * 60 * 1000)
    return end.toISOString()
  }

  const calculateDeviation = (produced: number, target: number): number => {
    if (target <= 0) return 0
    return ((produced - target) / target) * 100
  }

  // Recompute derived fields for an entry given an authoritative producedKg.
  const withDerivedFields = useCallback(
    (entry: ManualAdherenceEntry, producedKg: number, currentNow: number): ManualAdherenceEntry => {
      const remainingKg = Math.max(0, entry.targetKg - producedKg)
      return {
        ...entry,
        producedKg,
        remainingKg,
        status: calculateStatus(producedKg, entry.targetKg),
        estimatedEndTime: calculateEstimatedEnd(remainingKg, entry.lineRate, currentNow),
        deviation: calculateDeviation(producedKg, entry.targetKg),
        currentTime: new Date(currentNow).toISOString(),
      }
    },
    [],
  )

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
        return {
          lineId: entry.lineId,
          lineName: line?.name || "Linha Desconhecida",
          productId: entry.productId,
          targetKg: entry.targetQuantity,
          lineRate: entry.lineCapacity || entry.kgPerHour || 0,
          producedKg: 0,
          remainingKg: entry.targetQuantity,
        }
      })
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
      isRunning: false,
      baselineKg: 0,
    }
    onManualEntriesChange([...manualEntries, newEntry])
  }

  // Import lines from the loaded plan into manual entries (so the counter can start from plan data).
  const importFromPlan = () => {
    const planData = getPlanData()
    if (planData.length === 0) return
    const imported: ManualAdherenceEntry[] = planData.map((p) => ({
      id: `entry_${Date.now()}_${p.lineId}`,
      lineId: p.lineId,
      lineName: p.lineName,
      productId: p.productId || undefined,
      producedKg: 0,
      remainingKg: p.targetKg,
      startTime: new Date().toISOString(),
      currentTime: new Date().toISOString(),
      lineRate: p.lineRate,
      targetKg: p.targetKg,
      status: "on-track",
      isRunning: false,
      baselineKg: 0,
    }))
    onManualEntriesChange([...manualEntries, ...imported])
    setMode("manual")
  }

  // Update a manual field. If the entry is running, editing producedKg resets the baseline.
  const updateManualEntry = (id: string, updates: Partial<ManualAdherenceEntry>) => {
    const currentNow = Date.now()
    onManualEntriesChange(
      manualEntries.map((entry) => {
        if (entry.id !== id) return entry
        const merged = { ...entry, ...updates }

        // If running and the user manually changed producedKg, re-baseline so the live counter continues from there.
        if (merged.isRunning && updates.producedKg !== undefined) {
          merged.baselineKg = updates.producedKg
          merged.trackingStartTime = new Date(currentNow).toISOString()
        }
        // If running and the rate changed, re-baseline at the current produced value so we don't jump.
        if (merged.isRunning && updates.lineRate !== undefined && entry.trackingStartTime) {
          const live = getLiveProducedKg(entry, currentNow)
          merged.baselineKg = live
          merged.trackingStartTime = new Date(currentNow).toISOString()
        }

        const authoritativeProduced = merged.isRunning ? getLiveProducedKg(merged, currentNow) : merged.producedKg
        return withDerivedFields(merged, authoritativeProduced, currentNow)
      }),
    )
  }

  // Start the live counter for an entry.
  const startTracking = (id: string) => {
    const currentNow = Date.now()
    onManualEntriesChange(
      manualEntries.map((entry) => {
        if (entry.id !== id) return entry
        return {
          ...entry,
          isRunning: true,
          baselineKg: entry.producedKg, // continue from whatever is already produced
          trackingStartTime: new Date(currentNow).toISOString(),
          startTime: entry.startTime || new Date(currentNow).toISOString(),
          currentTime: new Date(currentNow).toISOString(),
        }
      }),
    )
    setNow(currentNow)
  }

  // Pause/stop the live counter and freeze the accumulated value (becomes editable).
  const stopTracking = (id: string) => {
    const currentNow = Date.now()
    onManualEntriesChange(
      manualEntries.map((entry) => {
        if (entry.id !== id) return entry
        const frozen = getLiveProducedKg(entry, currentNow)
        const stopped = {
          ...entry,
          isRunning: false,
          producedKg: Math.round(frozen),
          baselineKg: Math.round(frozen),
          trackingStartTime: undefined,
        }
        return withDerivedFields(stopped, stopped.producedKg, currentNow)
      }),
    )
  }

  const removeManualEntry = (id: string) => {
    onManualEntriesChange(manualEntries.filter((e) => e.id !== id))
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

  const automaticEntries = getPlanData()

  // Build display entries for manual mode with live produced values applied.
  const displayEntries = manualEntries.map((entry) => {
    const liveProduced = getLiveProducedKg(entry, now)
    return withDerivedFields(entry, liveProduced, now)
  })

  const calculateOverallAdherence = () => {
    const entries = mode === "automatic" ? automaticEntries : displayEntries
    if (entries.length === 0) return 0
    const totalTarget = entries.reduce((sum, e) => sum + (e.targetKg || 0), 0)
    const totalProduced = entries.reduce((sum, e) => sum + (e.producedKg || 0), 0)
    if (totalTarget === 0) return 0
    return (totalProduced / totalTarget) * 100
  }

  const overallAdherence = calculateOverallAdherence()

  // Notify parent of changes (use displayEntries so live values propagate).
  useEffect(() => {
    if (onAdherenceUpdate) {
      onAdherenceUpdate(displayEntries, overallAdherence)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, manualEntries, mode])

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
              {new Date(now).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setNow(Date.now())}>
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
              Plano
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-sm min-h-[44px]">
              <Target className="h-4 w-4 mr-2" />
              Contagem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-3 mt-4">
            {automaticEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sem plano carregado para este turno.</p>
                <p className="text-sm">Configure o plano semanal ou use o modo contagem.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={importFromPlan} className="w-full min-h-[48px]" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Importar Linhas do Plano para Contagem
                </Button>
                {automaticEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${getStatusColor(
                      calculateStatus(entry.producedKg, entry.targetKg),
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{entry.lineName}</span>
                      {getStatusBadge(calculateStatus(entry.producedKg, entry.targetKg))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Planeado</p>
                        <p className="font-semibold">{entry.targetKg} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Debito</p>
                        <p className="font-semibold">{entry.lineRate} kg/h</p>
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

            {displayEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sem entradas de contagem.</p>
                <p className="text-sm">Adicione uma linha ou importe do plano para iniciar a contagem em tempo real.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayEntries.map((entry) => (
                  <div key={entry.id} className={`p-4 rounded-lg border-l-4 space-y-3 ${getStatusColor(entry.status)}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Select
                        value={entry.lineId}
                        onValueChange={(value) => {
                          const line = productionLines.find((l) => l.id === value)
                          updateManualEntry(entry.id, { lineId: value, lineName: line?.name || "" })
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
                        {entry.isRunning && (
                          <Badge className="bg-blue-600 text-white animate-pulse">
                            <Play className="h-3 w-3 mr-1" />
                            A contar
                          </Badge>
                        )}
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

                    {/* Start / Pause controls */}
                    <div className="flex gap-2">
                      {entry.isRunning ? (
                        <Button
                          onClick={() => stopTracking(entry.id)}
                          className="flex-1 min-h-[48px] bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Parar Contagem
                        </Button>
                      ) : (
                        <Button
                          onClick={() => startTracking(entry.id)}
                          disabled={entry.lineRate <= 0}
                          className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Contagem
                        </Button>
                      )}
                      {!entry.isRunning && entry.producedKg > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => updateManualEntry(entry.id, { producedKg: 0, baselineKg: 0 })}
                          className="min-h-[48px]"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Repor
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          Kg Produzidos
                          {entry.isRunning && <span className="text-[10px] text-blue-600">(auto)</span>}
                        </Label>
                        <Input
                          type="number"
                          value={entry.isRunning ? Math.round(entry.producedKg) : entry.producedKg || ""}
                          onChange={(e) => updateManualEntry(entry.id, { producedKg: Number(e.target.value) })}
                          className={`min-h-[44px] ${entry.isRunning ? "border-blue-400 font-semibold" : ""}`}
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
                          value={
                            entry.startTime
                              ? new Date(entry.startTime).toLocaleTimeString("pt-PT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""
                          }
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":")
                            const date = new Date(selectedDate)
                            date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
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
                        <span className={`font-semibold ${entry.deviation >= 0 ? "text-green-600" : "text-red-600"}`}>
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
