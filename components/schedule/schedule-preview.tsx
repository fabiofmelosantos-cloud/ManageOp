"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, Download, AlertCircle, ChevronDown, ChevronUp, User, Briefcase, Package } from "lucide-react"
import type { ScheduleDay, ShiftType, Worker, ProductionLine, Product } from "@/lib/types"
import { exportScheduleToExcel } from "@/lib/excel-utils"
import { getSpecialties } from "@/lib/storage"
import { getUnallocatedWorkers } from "@/lib/schedule-generator"
import { useState } from "react"
import ScheduleBoardView from "./schedule-board-view"
import { SchedulePrintView } from "./schedule-print-view"

const shiftLabels = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
}

const shiftColors = {
  morning: "bg-blue-100 text-blue-800",
  afternoon: "bg-green-100 text-green-800",
  night: "bg-red-100 text-red-800",
}

interface SchedulePreviewProps {
  days: ScheduleDay[]
  workers: Worker[]
  productionLines: ProductionLine[]
  products: Product[]
  scheduleName?: string
  startDate?: string
  endDate?: string
  shiftFilter?: ShiftType | "all"
  dayFilter?: number | "all"
}

export function SchedulePreview({
  days,
  workers,
  productionLines,
  products,
  scheduleName,
  startDate,
  endDate,
  shiftFilter,
  dayFilter,
}: SchedulePreviewProps) {
  const [showUnallocated, setShowUnallocated] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "board">("board")
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all")
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setIsPrinting(false), 100)
    }, 100)
  }

  const handleExport = () => {
    console.log("[v0] Iniciando exportação de escala")
    const specialties = getSpecialties()

    try {
      exportScheduleToExcel(
        {
          id: "preview",
          name: scheduleName || `Escala ${formatDate(days[0]?.date || new Date().toISOString())}`,
          startDate: startDate || days[0]?.date || new Date().toISOString(),
          endDate: endDate || days[days.length - 1]?.date || new Date().toISOString(),
          days,
          unallocatedWorkers: getUnallocatedWorkers(days, workers).map((w) => w.id),
          createdAt: new Date().toISOString(),
        },
        workers,
        productionLines,
        products,
        specialties,
      )
      console.log("[v0] Exportação concluída com sucesso")
    } catch (error) {
      console.error("[v0] Erro na exportação:", error)
    }
  }

  if (isPrinting) {
    return (
      <SchedulePrintView
        days={days}
        workers={workers}
        productionLines={productionLines}
        products={products}
        specialties={getSpecialties()}
        scheduleName={scheduleName || "Escala de Trabalho"}
        startDate={startDate || days[0]?.date || new Date().toISOString()}
        endDate={endDate || days[days.length - 1]?.date || new Date().toISOString()}
      />
    )
  }

  const getWorkerName = (workerId: string) => {
    return workers.find((w) => w.id === workerId)?.name || "Desconhecido"
  }

  const getWorkerEmployeeId = (workerId: string) => {
    return workers.find((w) => w.id === workerId)?.employeeId || ""
  }

  const getLineName = (lineId: string) => {
    return productionLines.find((l) => l.id === lineId)?.name || "Desconhecida"
  }

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || "Desconhecido"
  }

  const getAssignedSpecialty = (workerId: string, lineId: string, productId: string): string => {
    const worker = workers.find((w) => w.id === workerId)
    const line = productionLines.find((l) => l.id === lineId)
    const specialties = getSpecialties()

    if (!worker || !line) return "N/A"

    const requirement = line.requirements.find((r) => r.productId === productId)
    if (!requirement || requirement.requiredSpecialties.length === 0) return "N/A"

    const matchingSpecialty = requirement.requiredSpecialties.find((rs) => worker.specialties.includes(rs.specialtyId))

    if (matchingSpecialty) {
      const specialty = specialties.find((s) => s.id === matchingSpecialty.specialtyId)
      return specialty?.name || "N/A"
    }

    return "N/A"
  }

  const getWorkPosition = (workerId: string, lineId: string, productId: string, position: number): string => {
    const specialty = getAssignedSpecialty(workerId, lineId, productId)
    if (specialty === "N/A") return `Posição ${position}`
    return `${specialty} - P${position}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const calculateWorkerOccupancy = () => {
    const occupancy = new Map<string, { workerId: string; shifts: number; days: Set<string> }>()

    days.forEach((day) => {
      day.assignments.forEach((assignment) => {
        const current = occupancy.get(assignment.workerId) || {
          workerId: assignment.workerId,
          shifts: 0,
          days: new Set<string>(),
        }
        current.shifts++
        current.days.add(day.date)
        occupancy.set(assignment.workerId, current)
      })
    })

    return Array.from(occupancy.values()).sort((a, b) => b.shifts - a.shifts)
  }

  const workerOccupancy = calculateWorkerOccupancy()
  const unallocatedWorkers = getUnallocatedWorkers(days, workers)
  const filteredDays = shiftFilter && shiftFilter !== "all" ? days.filter((day) => day.shift === shiftFilter) : days

  const finalFilteredDays =
    dayFilter === "all" ? filteredDays : filteredDays.filter((day, index) => index === dayFilter)

  const daysByDate = finalFilteredDays.reduce(
    (acc, day) => {
      if (!acc[day.date]) {
        acc[day.date] = []
      }
      acc[day.date].push(day)
      return acc
    },
    {} as Record<string, ScheduleDay[]>,
  )

  const totalAssignments = finalFilteredDays.reduce((sum, day) => sum + day.assignments.length, 0)
  const uniqueWorkers = new Set(finalFilteredDays.flatMap((day) => day.assignments.map((a) => a.workerId)))
  const uniqueDates = Array.from(new Set(filteredDays.map((d) => d.date))).sort()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "board" ? "default" : "outline"}
            onClick={() => setViewMode("board")}
            size="sm"
            className="flex-1"
          >
            Quadro
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
            size="sm"
            className="flex-1"
          >
            Detalhes
          </Button>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="flex-1 border rounded-md px-2 py-2 text-xs sm:text-sm bg-background"
          >
            <option value="all">Todos os Dias</option>
            {uniqueDates.map((date, index) => (
              <option key={date} value={index}>
                {formatDate(date)}
              </option>
            ))}
          </select>
          <Button onClick={handleExport} variant="outline" size="sm" className="px-3 bg-transparent">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "board" ? (
        <ScheduleBoardView
          days={finalFilteredDays}
          workers={workers}
          productionLines={productionLines}
          products={products}
          viewMode={selectedDayFilter === "all" ? "weekly" : "daily"}
          selectedDate={selectedDayFilter !== "all" ? uniqueDates[selectedDayFilter] : undefined}
        />
      ) : (
        <>
          {unallocatedWorkers.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <CardTitle>Operadores Não Alocados</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowUnallocated(!showUnallocated)}>
                    {showUnallocated ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <CardDescription>{unallocatedWorkers.length} operador(es) não foram alocados na escala</CardDescription>
              </CardHeader>
              {showUnallocated && (
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border bg-white dark:bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Especialidades</TableHead>
                          <TableHead>Turnos Disponíveis</TableHead>
                          <TableHead>Padrão de Escala</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unallocatedWorkers.map((worker) => {
                          const specialties = getSpecialties()
                          const workerSpecialties = worker.specialties
                            .map((sid) => specialties.find((s) => s.id === sid)?.name)
                            .filter(Boolean)
                            .join(", ")

                          const shiftNames = worker.availableShifts.map((s) => shiftLabels[s]).join(", ")
                          const patternLabels = {
                            "5x2": "5 dias / 2 folgas (rotativo)",
                            "4x2": "4 dias / 2 folgas (rotativo)",
                            "5x2-fixed": "Segunda a Sexta",
                          }

                          return (
                            <TableRow key={worker.id}>
                              <TableCell className="font-mono text-sm">{worker.employeeId}</TableCell>
                              <TableCell className="font-medium">{worker.name}</TableCell>
                              <TableCell>{workerSpecialties || "Nenhuma"}</TableCell>
                              <TableCell>{shiftNames}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {patternLabels[worker.schedulePattern]}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ocupação dos Operadores</CardTitle>
              <CardDescription>Resumo da alocação de cada trabalhador durante o período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Turnos Alocados</TableHead>
                      <TableHead className="text-right">Dias de Trabalho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerOccupancy.map((occ) => (
                      <TableRow key={occ.workerId}>
                        <TableCell className="font-mono text-sm">{getWorkerEmployeeId(occ.workerId)}</TableCell>
                        <TableCell className="font-medium">{getWorkerName(occ.workerId)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{occ.shifts}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{occ.days.size}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base sm:text-lg">Detalhes da Escala</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                {Object.keys(daysByDate).length} dias • {totalAssignments} alocações • {uniqueWorkers.size}{" "}
                trabalhadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                {Object.entries(daysByDate).map(([date, dayShifts]) => (
                  <div key={date} className="space-y-2 sm:space-y-3">
                    <h3 className="font-semibold text-base sm:text-lg sticky top-0 bg-background py-2 border-b">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {dayShifts.map((day) => (
                        <div key={`${day.date}-${day.shift}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={shiftColors[day.shift]}>{shiftLabels[day.shift]}</Badge>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {day.assignments.length} alocaç{day.assignments.length === 1 ? "ão" : "ões"}
                            </span>
                          </div>
                          {day.assignments.length > 0 ? (
                            <>
                              <div className="grid gap-2 sm:hidden">
                                {day.assignments.map((assignment, idx) => (
                                  <Card key={idx} className="border-l-4 border-l-primary">
                                    <CardContent className="p-2.5">
                                      {/* Header compacto com nome e ID */}
                                      <div className="flex items-center gap-2 mb-2">
                                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-sm truncate">
                                            {getWorkerName(assignment.workerId)}
                                          </p>
                                          <p className="text-xs text-muted-foreground font-mono">
                                            ID: {getWorkerEmployeeId(assignment.workerId)}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Linha com posto em tira vertical + Produto */}
                                      <div className="space-y-1.5">
                                        {/* Linha e Posto numa só linha */}
                                        <div className="flex items-center gap-1.5">
                                          <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <span className="font-medium text-sm truncate">
                                              {getLineName(assignment.productionLineId)}
                                            </span>
                                            <div className="h-5 w-px bg-border" />
                                            <Badge
                                              variant="outline"
                                              className="font-semibold text-xs px-1.5 py-0 h-5 flex-shrink-0"
                                            >
                                              P{assignment.position}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Produto */}
                                        <div className="flex items-center gap-1.5">
                                          <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <span className="text-sm truncate">
                                            {getProductName(assignment.productId)}
                                          </span>
                                        </div>

                                        {/* Especialidade */}
                                        <div className="pt-0.5">
                                          <Badge variant="secondary" className="text-xs">
                                            {getAssignedSpecialty(
                                              assignment.workerId,
                                              assignment.productionLineId,
                                              assignment.productId,
                                            )}
                                          </Badge>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>

                              <div className="hidden sm:block overflow-x-auto rounded-lg border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Matrícula</TableHead>
                                      <TableHead>Trabalhador</TableHead>
                                      <TableHead>Linha</TableHead>
                                      <TableHead>Produto</TableHead>
                                      <TableHead>Especialidade</TableHead>
                                      <TableHead>Posto</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.assignments.map((assignment, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell className="font-mono text-sm">
                                          {getWorkerEmployeeId(assignment.workerId)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {getWorkerName(assignment.workerId)}
                                        </TableCell>
                                        <TableCell>{getLineName(assignment.productionLineId)}</TableCell>
                                        <TableCell>{getProductName(assignment.productId)}</TableCell>
                                        <TableCell>
                                          <Badge variant="secondary">
                                            {getAssignedSpecialty(
                                              assignment.workerId,
                                              assignment.productionLineId,
                                              assignment.productId,
                                            )}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="font-semibold">
                                            P{assignment.position}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground italic py-2">
                              Nenhuma alocação para este turno
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
