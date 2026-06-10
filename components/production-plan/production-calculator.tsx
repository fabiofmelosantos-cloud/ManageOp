"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Square, RotateCcw, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductionTracking } from "@/lib/types"
import { productionTimerManager } from "@/lib/production-timer-manager"

interface ProductionCalculatorProps {
  targetQuantity: number
  lineCapacity: number
  tracking: ProductionTracking | null
  onUpdate: (producedQuantity: number, isRunning: boolean, startTime: string | null) => void
  lineId: string // Added lineId prop for consistent timer key
  date: string // Added date prop
  shift: string // Added shift prop
  lineLoad?: number // Added lineLoad for default value
  timeToLaminator?: number // Tempo em minutos
  timeToPackaging?: number // Tempo em minutos
}

export function ProductionCalculator({
  targetQuantity,
  lineCapacity,
  tracking,
  onUpdate,
  lineId,
  date,
  shift,
  lineLoad,
  timeToLaminator,
  timeToPackaging,
}: ProductionCalculatorProps) {
  const [producedQuantity, setProducedQuantity] = useState(tracking?.producedQuantity ?? 0)
  const [isRunning, setIsRunning] = useState(tracking?.isRunning ?? false)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(tracking?.startTime ?? null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [adherenceTarget, setAdherenceTarget] = useState(targetQuantity)
  const [palletTargetCount, setPalletTargetCount] = useState(0)
  const [palletRealCount, setPalletRealCount] = useState(0)
  const [semiQuantity, setSemiQuantity] = useState(0)
  const [loadQuantity, setLoadQuantity] = useState(lineLoad || 0)
  const [adherenceStartTime, setAdherenceStartTime] = useState<string>(new Date().toISOString())

  const timerKey = `${date}-${shift}-${lineId}`

  useEffect(() => {
    console.log("[v0] Calculator mounted with timer key:", timerKey)

    const timerData = productionTimerManager.getTimerData(timerKey)
    if (timerData) {
      console.log("[v0] Restoring timer data:", timerData)
      setProducedQuantity(timerData.producedQuantity ?? 0)
      setIsRunning(timerData.isRunning ?? false)
      setIsPaused(timerData.isPaused ?? false)
      setStartTime(timerData.startTime ?? null)
      setElapsedSeconds(timerData.elapsedSeconds || 0)
    }
  }, [timerKey])

  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => {
      if (event.detail.key === timerKey) {
        console.log("[v0] Timer update for key:", timerKey, event.detail)
        setProducedQuantity(event.detail.producedQuantity)
        setIsRunning(event.detail.isRunning)
        setElapsedSeconds(event.detail.elapsedSeconds || 0)
      }
    }

    window.addEventListener("production-timer-update", handleTimerUpdate as EventListener)

    return () => {
      window.removeEventListener("production-timer-update", handleTimerUpdate as EventListener)
    }
  }, [timerKey])

  useEffect(() => {
    if (tracking) {
      setProducedQuantity(tracking.producedQuantity ?? 0)
      setIsRunning(tracking.isRunning ?? false)
      setStartTime(tracking.startTime ?? null)
    }
  }, [tracking])

  useEffect(() => {
    onUpdate(producedQuantity, isRunning, startTime)
  }, [producedQuantity, isRunning, startTime, onUpdate])

  const handleStart = () => {
    const now = new Date().toISOString()
    console.log("[v0] Starting timer with key:", timerKey)
    setStartTime(now)
    setIsRunning(true)
    setIsPaused(false)
    productionTimerManager.startTimer(timerKey, targetQuantity, lineCapacity, now)
    onUpdate(producedQuantity, true, now)
  }

  const handlePause = () => {
    const newPaused = !isPaused
    setIsPaused(newPaused)
    if (newPaused) {
      console.log("[v0] Pausing timer:", timerKey)
      productionTimerManager.pauseTimer(timerKey)
    } else {
      console.log("[v0] Resuming timer:", timerKey)
      productionTimerManager.resumeTimer(timerKey)
    }
  }

  const handleStop = () => {
    console.log("[v0] Stopping timer:", timerKey)
    setIsRunning(false)
    setIsPaused(false)
    productionTimerManager.stopTimer(timerKey)
    onUpdate(producedQuantity, false, startTime)
  }

  const handleReset = () => {
    console.log("[v0] Resetting timer:", timerKey)
    setProducedQuantity(0)
    setIsRunning(false)
    setIsPaused(false)
    setStartTime(null)
    setElapsedSeconds(0)
    setAdherenceTarget(targetQuantity)
    setPalletTargetCount(0)
    setPalletRealCount(0)
    setSemiQuantity(0)
    setLoadQuantity(lineLoad || 0)
    setAdherenceStartTime(new Date().toISOString())
    productionTimerManager.resetTimer(timerKey)
    onUpdate(0, false, null)
  }

  const safeProducedQuantity = producedQuantity ?? 0
  const progress = targetQuantity > 0 ? (safeProducedQuantity / targetQuantity) * 100 : 0
  const remainingQuantity = Math.max(0, targetQuantity - safeProducedQuantity)
  const remainingHours = lineCapacity > 0 ? remainingQuantity / lineCapacity : 0

  const effectiveTarget = adherenceTarget - semiQuantity - loadQuantity
  const adherencePercentage = effectiveTarget > 0 ? (safeProducedQuantity / effectiveTarget) * 100 : 0

  const calculateAdherenceStopTimes = () => {
    if (effectiveTarget <= 0 || lineCapacity <= 0) return null

    const hoursNeeded = effectiveTarget / lineCapacity
    const millisecondsNeeded = hoursNeeded * 60 * 60 * 1000

    const lineStopTime = new Date(new Date(adherenceStartTime).getTime() + millisecondsNeeded)

    let laminatorStopTime = null
    let packagingStopTime = null

    if (timeToLaminator && timeToLaminator > 0) {
      laminatorStopTime = new Date(lineStopTime.getTime() - timeToLaminator * 60 * 1000)
    }

    if (timeToPackaging && timeToPackaging > 0 && timeToLaminator && timeToLaminator > 0) {
      packagingStopTime = new Date(lineStopTime.getTime() - (timeToLaminator + timeToPackaging) * 60 * 1000)
    }

    return {
      lineStop: lineStopTime,
      laminatorStop: laminatorStopTime,
      packagingStop: packagingStopTime,
      hoursNeeded: hoursNeeded,
    }
  }

  const adherenceStopTimes = calculateAdherenceStopTimes()

  const calculateIdealEndTime = () => {
    if (!startTime || lineCapacity <= 0 || targetQuantity <= 0) return null

    const totalHoursNeeded = targetQuantity / lineCapacity
    const totalMillisecondsNeeded = totalHoursNeeded * 60 * 60 * 1000

    const idealEnd = new Date(new Date(startTime).getTime() + totalMillisecondsNeeded)
    console.log("[v0] Ideal End Time Calculation:", {
      startTime,
      targetQuantity,
      lineCapacity,
      totalHoursNeeded,
      idealEnd: idealEnd.toISOString(),
    })

    return idealEnd
  }

  const estimatedEndTime = calculateIdealEndTime()

  useEffect(() => {
    console.log("[v0] Estimated End Time updated:", {
      estimatedEndTime: estimatedEndTime?.toISOString(),
      startTime,
      isRunning,
      lineCapacity,
      targetQuantity,
    })
  }, [estimatedEndTime, startTime, isRunning, lineCapacity, targetQuantity])

  const getStatusBadge = () => {
    if (isRunning && !isPaused) {
      return <Badge className="bg-green-500">Em Produção</Badge>
    }
    if (isPaused) {
      return <Badge className="bg-yellow-500">Pausada</Badge>
    }
    if (safeProducedQuantity >= targetQuantity) {
      return <Badge className="bg-blue-500">Concluída</Badge>
    }
    return <Badge variant="outline">Parada</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Calculadora Principal */}
      <Card className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-semibold">Produção</p>
              {getStatusBadge()}
            </div>
            <p className="text-xl sm:text-2xl font-bold">{safeProducedQuantity.toFixed(0)} kg</p>
            <p className="text-xs text-muted-foreground">
              Meta: {targetQuantity} kg ({progress.toFixed(1)}%)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
              disabled={safeProducedQuantity >= targetQuantity}
            >
              <Play className="h-5 w-5 mr-2" />
              Arrancar
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePause}
                size="lg"
                className="flex-1 min-h-[44px]"
                variant={isPaused ? "default" : "secondary"}
              >
                <Pause className="h-5 w-5 mr-2" />
                {isPaused ? "Retomar" : "Pausar"}
              </Button>
              <Button onClick={handleStop} size="lg" className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700">
                <Square className="h-5 w-5 mr-2" />
                Parar
              </Button>
            </>
          )}
          <Button onClick={handleReset} size="lg" variant="outline" className="min-h-[44px] bg-transparent">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${isPaused ? "bg-yellow-500" : "bg-primary"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="bg-muted/50 p-2 rounded">
              <p className="text-muted-foreground">Restante</p>
              <p className="font-semibold text-base">{remainingQuantity.toFixed(0)} kg</p>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <p className="text-muted-foreground">Tempo</p>
              <p className="font-semibold text-base">{isRunning ? `${remainingHours.toFixed(1)}h` : "-"}</p>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <p className="text-muted-foreground">Velocidade</p>
              <p className="font-semibold text-base">{lineCapacity} kg/h</p>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <p className="text-muted-foreground">Fim Previsto (Ideal)</p>
              <p className="font-semibold text-base">
                {estimatedEndTime
                  ? `${estimatedEndTime.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })} às ${estimatedEndTime.toLocaleTimeString(
                      "pt-PT",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold">Aderência - Planejamento</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Objetivo (kg)</Label>
            <Input
              type="number"
              value={adherenceTarget}
              onChange={(e) => setAdherenceTarget(Number(e.target.value))}
              className="h-9 text-sm"
              min={0}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Paletes Objetivo</Label>
            <Input
              type="number"
              value={palletTargetCount}
              onChange={(e) => setPalletTargetCount(Number(e.target.value))}
              className="h-9 text-sm"
              min={0}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Semi (kg)</Label>
            <Input
              type="number"
              value={semiQuantity}
              onChange={(e) => setSemiQuantity(Number(e.target.value))}
              className="h-9 text-sm"
              min={0}
              placeholder="Debitado ao total"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Paletes Real</Label>
            <Input
              type="number"
              value={palletRealCount}
              onChange={(e) => setPalletRealCount(Number(e.target.value))}
              className="h-9 text-sm bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700"
              min={0}
              placeholder="Produzidas"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Carregamento (kg)</Label>
            <Input
              type="number"
              value={loadQuantity}
              onChange={(e) => setLoadQuantity(Number(e.target.value))}
              className="h-9 text-sm"
              min={0}
              placeholder={lineLoad ? `Padrão: ${lineLoad}` : "Manual"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hora de Início (Planejamento)</Label>
            <Input
              type="datetime-local"
              value={adherenceStartTime.slice(0, 16) || ""}
              onChange={(e) => setAdherenceStartTime(new Date(e.target.value).toISOString())}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
