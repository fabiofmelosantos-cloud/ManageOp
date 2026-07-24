"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Activity,
  Play,
  Pause,
  AlertTriangle,
  Wrench,
  Sparkles,
  Clock,
  LayoutGrid,
  Users,
  Package,
  Shield,
} from "lucide-react"
import type { LineStatusEntry, LineStatus, ProductionLine, ShiftType, Product } from "@/lib/types"

interface LinesDashboardProps {
  productionLines: ProductionLine[]
  products?: Product[]
  selectedDate: string
  selectedShift: ShiftType
  onStatusUpdate?: (statuses: LineStatusEntry[]) => void
}

const STATUS_CONFIG: Record<
  LineStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  running: {
    label: "Em Producao",
    icon: Play,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/50 border-green-500",
  },
  stopped: {
    label: "Parada",
    icon: Pause,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/50 border-red-500",
  },
  cleaning: {
    label: "Limpeza",
    icon: Sparkles,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/50 border-blue-500",
  },
  incident: {
    label: "Incidencia",
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/50 border-orange-500",
  },
  maintenance: {
    label: "Manutencao",
    icon: Wrench,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/50 border-purple-500",
  },
}

export function LinesDashboard({
  productionLines,
  products = [],
  selectedDate,
  selectedShift,
  onStatusUpdate,
}: LinesDashboardProps) {
  const [lineStatuses, setLineStatuses] = useState<LineStatusEntry[]>([])

  // Initialize line statuses
  useEffect(() => {
    const initialStatuses = productionLines
      .filter((l) => l.isActive)
      .map((line) => ({
        lineId: line.id,
        lineName: line.name,
        status: "stopped" as LineStatus,
        productionHours: 0,
        cleaningHours: 0,
        stoppedHours: 0,
        lastUpdate: new Date().toISOString(),
        productName: "",
        totalPeople: 0,
        qualityWallPeople: 0,
      }))
    setLineStatuses(initialStatuses)
  }, [productionLines])

  const updateLineStatus = (lineId: string, updates: Partial<LineStatusEntry>) => {
    setLineStatuses((prev) =>
      prev.map((ls) =>
        ls.lineId === lineId
          ? { ...ls, ...updates, lastUpdate: new Date().toISOString() }
          : ls
      )
    )
  }

  const getStatusCounts = () => {
    const counts: Record<LineStatus, number> = {
      running: 0,
      stopped: 0,
      cleaning: 0,
      incident: 0,
      maintenance: 0,
    }
    lineStatuses.forEach((ls) => {
      counts[ls.status]++
    })
    return counts
  }

  // Calculate workforce summary
  const getWorkforceSummary = () => {
    let totalPeople = 0
    let totalProductionHours = 0
    let totalQualityWallHours = 0

    lineStatuses.forEach((ls) => {
      if (ls.totalPeople > 0 && ls.productionHours > 0) {
        const productionPeople = ls.totalPeople - ls.qualityWallPeople
        totalPeople += ls.totalPeople
        totalProductionHours += productionPeople * ls.productionHours
        totalQualityWallHours += ls.qualityWallPeople * ls.productionHours
      }
    })

    return { totalPeople, totalProductionHours, totalQualityWallHours }
  }

  // Notify parent of changes
  useEffect(() => {
    if (onStatusUpdate) {
      onStatusUpdate(lineStatuses)
    }
  }, [lineStatuses, onStatusUpdate])

  const counts = getStatusCounts()
  const totalLines = lineStatuses.length
  const runningPercentage = totalLines > 0 ? (counts.running / totalLines) * 100 : 0
  const workforceSummary = getWorkforceSummary()

  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <LayoutGrid className="h-5 w-5 text-cyan-600" />
            Linhas a Notificar
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {counts.running}/{totalLines} em producao
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(STATUS_CONFIG) as LineStatus[]).map((status) => {
            const config = STATUS_CONFIG[status]
            const Icon = config.icon
            return (
              <div
                key={status}
                className={`p-3 rounded-lg border-2 text-center ${
                  counts[status] > 0 ? config.bgColor : "bg-muted/30 border-border"
                }`}
              >
                <Icon className={`h-5 w-5 mx-auto mb-1 ${counts[status] > 0 ? config.color : "text-muted-foreground"}`} />
                <p className={`text-2xl font-bold ${counts[status] > 0 ? config.color : "text-muted-foreground"}`}>
                  {counts[status]}
                </p>
                <p className="text-xs text-muted-foreground truncate">{config.label}</p>
              </div>
            )
          })}
        </div>

        {/* Workforce Summary Card */}
        {workforceSummary.totalPeople > 0 && (
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Resumo Horas a Notificar</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{workforceSummary.totalPeople}</p>
                <p className="text-xs opacity-90">Pessoas Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{workforceSummary.totalProductionHours}h</p>
                <p className="text-xs opacity-90">Horas Producao</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{workforceSummary.totalQualityWallHours}h</p>
                <p className="text-xs opacity-90">Horas Muro (041)</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Taxa de Operacao</span>
            <span className="font-semibold">{runningPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden flex">
            {counts.running > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(counts.running / totalLines) * 100}%` }}
              />
            )}
            {counts.cleaning > 0 && (
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${(counts.cleaning / totalLines) * 100}%` }}
              />
            )}
            {counts.incident > 0 && (
              <div
                className="bg-orange-500 h-full transition-all"
                style={{ width: `${(counts.incident / totalLines) * 100}%` }}
              />
            )}
            {counts.maintenance > 0 && (
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${(counts.maintenance / totalLines) * 100}%` }}
              />
            )}
            {counts.stopped > 0 && (
              <div
                className="bg-red-500 h-full transition-all"
                style={{ width: `${(counts.stopped / totalLines) * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Lines Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lineStatuses.map((ls) => {
            const config = STATUS_CONFIG[ls.status]
            const Icon = config.icon
            const productionPeople = ls.totalPeople - ls.qualityWallPeople
            const productionHoursTotal = productionPeople * ls.productionHours
            const qualityHoursTotal = ls.qualityWallPeople * ls.productionHours

            return (
              <Dialog key={ls.lineId}>
                <DialogTrigger asChild>
                  <button
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md text-left w-full ${config.bgColor}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{ls.lineName}</span>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    
                    {/* Product Name */}
                    {ls.productName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Package className="h-3 w-3" />
                        <span className="truncate">{ls.productName}</span>
                      </div>
                    )}

                    <Badge
                      className={`text-xs ${
                        ls.status === "running"
                          ? "bg-green-600"
                          : ls.status === "stopped"
                          ? "bg-red-600"
                          : ls.status === "cleaning"
                          ? "bg-blue-600"
                          : ls.status === "incident"
                          ? "bg-orange-600"
                          : "bg-purple-600"
                      } text-white`}
                    >
                      {config.label}
                    </Badge>

                    {/* People and Hours Summary */}
                    {ls.totalPeople > 0 && (
                      <div className="mt-3 p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-1 text-xs font-semibold mb-1">
                          <Users className="h-3 w-3" />
                          {ls.totalPeople} pessoas x {ls.productionHours}h
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span>Producao ({productionPeople}p):</span>
                            <span className="font-semibold">{productionHoursTotal}h</span>
                          </div>
                          {ls.qualityWallPeople > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span>Muro 041 ({ls.qualityWallPeople}p):</span>
                              <span className="font-semibold">{qualityHoursTotal}h</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground">Prod</p>
                        <p className="font-semibold">{ls.productionHours}h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Limp</p>
                        <p className="font-semibold">{ls.cleaningHours}h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Para</p>
                        <p className="font-semibold">{ls.stoppedHours}h</p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Editar {ls.lineName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Product Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produto em Producao
                      </Label>
                      {products.length > 0 ? (
                        <Select
                          value={ls.productName || ""}
                          onValueChange={(value) => updateLineStatus(ls.lineId, { productName: value })}
                        >
                          <SelectTrigger className="min-h-[48px]">
                            <SelectValue placeholder="Selecionar produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={ls.productName || ""}
                          onChange={(e) => updateLineStatus(ls.lineId, { productName: e.target.value })}
                          placeholder="Nome do produto..."
                          className="min-h-[48px]"
                        />
                      )}
                    </div>

                    {/* People Configuration */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4" />
                        Configuracao de Pessoas
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Total Pessoas</Label>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            value={ls.totalPeople || ""}
                            onChange={(e) =>
                              updateLineStatus(ls.lineId, { totalPeople: Number(e.target.value) })
                            }
                            className="min-h-[48px]"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Shield className="h-3 w-3 text-amber-600" />
                            Muro Qualidade (041)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={ls.totalPeople || 50}
                            value={ls.qualityWallPeople || ""}
                            onChange={(e) =>
                              updateLineStatus(ls.lineId, { qualityWallPeople: Number(e.target.value) })
                            }
                            className="min-h-[48px]"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Hours Calculation Preview */}
                      {ls.totalPeople > 0 && ls.productionHours > 0 && (
                        <div className="mt-3 p-3 bg-background rounded-lg text-sm">
                          <p className="font-semibold mb-2">Calculo de Horas:</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Producao: {ls.totalPeople - ls.qualityWallPeople} x {ls.productionHours}h =</span>
                              <span className="font-bold">{(ls.totalPeople - ls.qualityWallPeople) * ls.productionHours}h</span>
                            </div>
                            {ls.qualityWallPeople > 0 && (
                              <div className="flex justify-between text-amber-600">
                                <span>Muro (041): {ls.qualityWallPeople} x {ls.productionHours}h =</span>
                                <span className="font-bold">{ls.qualityWallPeople * ls.productionHours}h</span>
                              </div>
                            )}
                            <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                              <span>Total:</span>
                              <span>{ls.totalPeople * ls.productionHours}h</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Line Status */}
                    <div className="space-y-2">
                      <Label>Estado da Linha</Label>
                      <Select
                        value={ls.status}
                        onValueChange={(value) => updateLineStatus(ls.lineId, { status: value as LineStatus })}
                      >
                        <SelectTrigger className="min-h-[48px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_CONFIG) as LineStatus[]).map((status) => {
                            const cfg = STATUS_CONFIG[status]
                            const StatusIcon = cfg.icon
                            return (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                                  <span>{cfg.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hours */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Horas Producao</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={ls.productionHours || ""}
                          onChange={(e) =>
                            updateLineStatus(ls.lineId, { productionHours: Number(e.target.value) })
                          }
                          className="min-h-[48px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Horas Limpeza</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={ls.cleaningHours || ""}
                          onChange={(e) =>
                            updateLineStatus(ls.lineId, { cleaningHours: Number(e.target.value) })
                          }
                          className="min-h-[48px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Horas Parada</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={ls.stoppedHours || ""}
                          onChange={(e) =>
                            updateLineStatus(ls.lineId, { stoppedHours: Number(e.target.value) })
                          }
                          className="min-h-[48px]"
                        />
                      </div>
                    </div>

                    {(ls.status === "stopped" || ls.status === "incident" || ls.status === "maintenance") && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Motivo da Paragem</Label>
                        <Textarea
                          value={ls.stoppageReason || ""}
                          onChange={(e) => updateLineStatus(ls.lineId, { stoppageReason: e.target.value })}
                          placeholder="Descrever motivo..."
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    {ls.status === "incident" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Descricao da Incidencia</Label>
                        <Textarea
                          value={ls.incidentDescription || ""}
                          onChange={(e) =>
                            updateLineStatus(ls.lineId, { incidentDescription: e.target.value })
                          }
                          placeholder="Detalhes da incidencia..."
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ultima atualizacao:{" "}
                      {new Date(ls.lastUpdate).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              lineStatuses.forEach((ls) => updateLineStatus(ls.lineId, { status: "running" }))
            }
            className="min-h-[40px] text-green-600 border-green-300 hover:bg-green-50"
          >
            <Play className="h-4 w-4 mr-1" />
            Todas em Producao
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              lineStatuses.forEach((ls) => updateLineStatus(ls.lineId, { status: "stopped" }))
            }
            className="min-h-[40px] text-red-600 border-red-300 hover:bg-red-50"
          >
            <Pause className="h-4 w-4 mr-1" />
            Todas Paradas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              lineStatuses.forEach((ls) =>
                updateLineStatus(ls.lineId, {
                  productionHours: 0,
                  cleaningHours: 0,
                  stoppedHours: 0,
                  stoppageReason: "",
                  incidentDescription: "",
                })
              )
            }
            className="min-h-[40px]"
          >
            Limpar Horas
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
