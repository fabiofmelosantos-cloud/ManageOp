"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductionCalculator } from "@/components/production-plan/production-calculator"
import { getProductionLines, getWorkers, getSchedules } from "@/lib/storage"
import { loadProductionLines, loadWorkers, loadSchedules } from "@/lib/storage"
import { getLatestWeeklyPlan } from "@/lib/storage"
import { getShiftLabel } from "@/lib/shift-utils"
import type { ProductionLine, Worker, Schedule, ShiftType, ProductionTracking, AttendanceRecord } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"

export default function CoordinatorPage() {
  const { userProfile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [currentShift, setCurrentShift] = useState<ShiftType>("morning")
  const [selectedLines, setSelectedLines] = useState<string[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<string>("")

  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map())
  const [isConfirming, setIsConfirming] = useState(false)

  const trackingMapRef = useRef<Map<string, ProductionTracking>>(new Map())

  const loadData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([loadProductionLines(), loadWorkers(), loadSchedules()])
      const [linesData, workersData, schedulesData] = await Promise.all([
        getProductionLines(),
        getWorkers(),
        getSchedules(),
      ])
      setProductionLines(linesData)
      setWorkers(workersData)
      setSchedules(schedulesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (productionLines.length > 0 && selectedLines.length === 0) {
      setSelectedLines([productionLines[0].id])
      setActiveTab(productionLines[0].id)
    }
  }, [productionLines, selectedLines])

  const handleUpdateTracking = (
    lineId: string,
    producedQuantity: number,
    isRunning: boolean,
    startTime: string | null,
  ) => {
    const key = `${selectedDate}-${currentShift}-${lineId}`
    trackingMapRef.current.set(key, {
      producedQuantity,
      isRunning,
      startTime,
    })
  }

  const getTracking = (lineId: string): ProductionTracking => {
    const key = `${selectedDate}-${currentShift}-${lineId}`
    return (
      trackingMapRef.current.get(key) ?? {
        producedQuantity: 0,
        isRunning: false,
        startTime: null,
      }
    )
  }

  const getCurrentShiftInfo = () => {
    const now = new Date()
    const hour = now.getHours()

    if (hour >= 8 && hour < 16) return { shift: "morning" as ShiftType, label: "Manhã (08:00-16:00)" }
    if (hour >= 16 || hour < 0) return { shift: "afternoon" as ShiftType, label: "Tarde (16:00-00:00)" }
    return { shift: "night" as ShiftType, label: "Noite (00:00-08:00)" }
  }

  const currentShiftInfo = getCurrentShiftInfo()

  const plan = getLatestWeeklyPlan()
  const todayPlan = plan?.days.find((d) => d.date === selectedDate)
  const shiftPlan = todayPlan?.shifts.find((s) => s.shift === currentShift)

  const activeLineId = activeTab || selectedLines[0] || ""
  const lineEntry = shiftPlan?.entries.find((e) => e.lineId === activeLineId)
  const selectedLineObj = productionLines.find((l) => l.id === activeLineId)
  const selectedProduct = selectedLineObj?.products?.find((p) => p.id === lineEntry?.productId)

  const allocatedWorkers = workers.filter((w) =>
    schedules.some((s) =>
      s.days.some(
        (d) =>
          d.date === selectedDate &&
          d.shift === currentShift &&
          d.assignments.some((a) => a.workerId === w.id && a.productionLineId === activeLineId),
      ),
    ),
  )

  const toggleLineSelection = (lineId: string) => {
    setSelectedLines((prev) => {
      if (prev.includes(lineId)) {
        const newSelection = prev.filter((id) => id !== lineId)
        if (activeTab === lineId && newSelection.length > 0) {
          setActiveTab(newSelection[0])
        }
        return newSelection
      } else {
        if (prev.length === 0) {
          setActiveTab(lineId)
        }
        return [...prev, lineId]
      }
    })
  }

  const handleAttendance = (workerId: string, workerName: string, status: "present" | "absent") => {
    const key = `${workerId}-${selectedDate}-${currentShift}`
    const record: AttendanceRecord = {
      workerId,
      workerName,
      date: selectedDate,
      shift: currentShift,
      lineId: activeLineId,
      status,
      markedAt: new Date().toISOString(),
      markedBy: userProfile?.name || "Desconhecido",
    }

    const newRecords = new Map(attendanceRecords)
    newRecords.set(key, record)
    setAttendanceRecords(newRecords)

    console.log(`[v0] ${workerName} marcado como ${status === "present" ? "Presente" : "Falta"}`)
  }

  const handleConfirmAttendance = async () => {
    setIsConfirming(true)
    try {
      // TODO: Salvar confirmações no storage
      const confirmation = {
        lineId: activeLineId,
        lineName: selectedLineObj?.name || "",
        coordinatorName: userProfile?.name || "Desconhecido",
        date: selectedDate,
        shift: currentShift,
        confirmedAt: new Date().toISOString(),
        attendance: Array.from(attendanceRecords.values()),
      }

      console.log("[v0] Confirmação de presenças:", confirmation)

      alert("Presenças confirmadas com sucesso!")
      setAttendanceRecords(new Map()) // Limpar após confirmar
    } catch (error) {
      console.error("[v0] Erro ao confirmar presenças:", error)
      alert("Erro ao confirmar presenças")
    } finally {
      setIsConfirming(false)
    }
  }

  const getAttendanceStatus = (workerId: string): AttendanceRecord | undefined => {
    const key = `${workerId}-${selectedDate}-${currentShift}`
    return attendanceRecords.get(key)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="text-center py-12">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 bg-background pb-6">
      <div className="mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Quadro do Coordenador</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Bem-vindo, <span className="font-semibold">{userProfile?.name || "Coordenador"}</span>
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm text-foreground">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 h-11 sm:h-10 text-sm touch-manipulation"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm text-foreground">Turno</Label>
                <Select value={currentShift} onValueChange={(value) => setCurrentShift(value as ShiftType)}>
                  <SelectTrigger className="h-11 sm:h-10 text-sm touch-manipulation">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning" className="touch-manipulation">
                      {getShiftLabel("morning")}
                    </SelectItem>
                    <SelectItem value="afternoon" className="touch-manipulation">
                      {getShiftLabel("afternoon")}
                    </SelectItem>
                    <SelectItem value="night" className="touch-manipulation">
                      {getShiftLabel("night")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-foreground">Linhas de Produção</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 sm:p-3 bg-muted rounded-lg">
                {productionLines.map((line) => {
                  const isSelected = selectedLines.includes(line.id)
                  return (
                    <label
                      key={line.id}
                      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-2 rounded cursor-pointer transition-colors touch-manipulation min-h-[48px] ${
                        isSelected
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-card border-2 border-border hover:bg-accent active:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLineSelection(line.id)}
                        className="h-5 w-5 sm:h-4 sm:w-4 text-primary rounded touch-manipulation"
                      />
                      <span className="text-xs sm:text-sm font-medium flex-1 text-foreground">
                        {line.name}{" "}
                        {line.rpm && <span className="text-xs text-muted-foreground">({line.rpm} RPM)</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {selectedLines.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {selectedLines.map((lineId) => {
                  const line = productionLines.find((l) => l.id === lineId)
                  return (
                    <button
                      key={lineId}
                      onClick={() => setActiveTab(lineId)}
                      className={`px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm touch-manipulation min-h-[44px] ${
                        activeTab === lineId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-accent active:bg-accent"
                      }`}
                    >
                      {line?.name || "N/A"}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedLineObj && (
              <div className="bg-primary/10 p-3 rounded-lg border-l-4 border-primary">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto</p>
                    <p className="font-semibold text-foreground">{selectedProduct?.name || "Não alocado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacidade</p>
                    <p className="font-semibold text-foreground">{lineEntry?.lineCapacity || 0} kg/h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="font-semibold text-foreground">{lineEntry?.targetQuantity || 0} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Operadores</p>
                    <p className="font-semibold text-foreground">{allocatedWorkers.length}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {lineEntry && lineEntry.targetQuantity > 0 ? (
          <ProductionCalculator
            targetQuantity={lineEntry.targetQuantity}
            lineCapacity={lineEntry.lineCapacity}
            tracking={getTracking(activeLineId)}
            onUpdate={(producedQuantity, isRunning, startTime) =>
              handleUpdateTracking(activeLineId, producedQuantity, isRunning, startTime)
            }
            lineId={activeLineId}
            date={selectedDate}
            shift={currentShift}
            lineLoad={selectedLineObj?.lineLoad}
            timeToLaminator={selectedLineObj?.timeToLaminator}
            timeToPackaging={selectedLineObj?.timeToPackaging}
          />
        ) : (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              {selectedLines.length === 0
                ? "Selecione pelo menos uma linha de produção para continuar."
                : "Sem produção alocada para esta linha neste turno. Configure o plano semanal."}
            </p>
          </Card>
        )}

        {allocatedWorkers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Picagem de Presença - Operadores Alocados ({allocatedWorkers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allocatedWorkers.map((worker) => {
                  const schedule = schedules.find((s) =>
                    s.days.some(
                      (d) =>
                        d.date === selectedDate &&
                        d.shift === currentShift &&
                        d.assignments.some((a) => a.workerId === worker.id && a.productionLineId === activeLineId),
                    ),
                  )
                  const assignment = schedule?.days
                    .find((d) => d.date === selectedDate && d.shift === currentShift)
                    ?.assignments.find((a) => a.workerId === worker.id && a.productionLineId === activeLineId)

                  const attendanceStatus = getAttendanceStatus(worker.id)
                  const isPresent = attendanceStatus?.status === "present"
                  const isAbsent = attendanceStatus?.status === "absent"

                  return (
                    <div
                      key={worker.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all ${
                        isPresent
                          ? "bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-600"
                          : isAbsent
                            ? "bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-600"
                            : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {worker.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-foreground">{worker.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>#{worker.employeeNumber}</span>
                            {assignment?.positionName && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{assignment.positionName}</span>
                              </>
                            )}
                            {assignment?.isTraining && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 rounded-full text-xs font-semibold">
                                EM FORMAÇÃO
                              </span>
                            )}
                          </div>
                          {worker.company && (
                            <div className="mt-1">
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: worker.companyColor
                                    ? `${worker.companyColor}20`
                                    : "hsl(var(--muted))",
                                  color: worker.companyColor || "hsl(var(--muted-foreground))",
                                  borderBottom: worker.companyColor ? `2px solid ${worker.companyColor}` : "none",
                                }}
                              >
                                {worker.company}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          className={`flex-1 min-w-[100px] px-3 sm:px-4 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                            isPresent
                              ? "bg-green-600 text-white"
                              : "bg-green-500 hover:bg-green-600 active:bg-green-700 text-white"
                          }`}
                          onClick={() => handleAttendance(worker.id, worker.name, "present")}
                          disabled={isPresent}
                        >
                          {isPresent ? "✓ Presente" : "Presente"}
                        </button>
                        <button
                          className={`flex-1 min-w-[100px] px-3 sm:px-4 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                            isAbsent
                              ? "bg-red-600 text-white"
                              : "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white"
                          }`}
                          onClick={() => handleAttendance(worker.id, worker.name, "absent")}
                          disabled={isAbsent}
                        >
                          {isAbsent ? "✓ Falta" : "Falta"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-muted-foreground">
                    Marcados: {attendanceRecords.size} de {allocatedWorkers.length}
                  </span>
                  {attendanceRecords.size === allocatedWorkers.length && (
                    <span className="text-green-600 dark:text-green-400 font-semibold">✓ Todos marcados</span>
                  )}
                </div>
                <button
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirmAttendance}
                  disabled={attendanceRecords.size === 0 || isConfirming}
                >
                  {isConfirming ? "Confirmando..." : "Confirmar Presenças"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
