"use client"
import { Button } from "@/components/ui/button"
import { Printer, Maximize2, Minimize2, Edit2, Save, X, Plus, GraduationCap } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ScheduleDay, ShiftType, Worker, ProductionLine, Product, ShiftAssignment } from "@/lib/types"
import { getSpecialties } from "@/lib/storage"

interface ScheduleBoardViewProps {
  days: ScheduleDay[]
  workers: Worker[]
  productionLines: ProductionLine[]
  products: Product[]
  viewMode: "daily" | "weekly"
  selectedDate?: string
  onUpdate?: (updatedDays: ScheduleDay[]) => void
}

export function ScheduleBoardView({
  days,
  workers,
  productionLines,
  products,
  viewMode,
  selectedDate,
  onUpdate,
}: ScheduleBoardViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDays, setEditedDays] = useState<ScheduleDay[]>(days)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [addWorkerContext, setAddWorkerContext] = useState<{
    date: string
    shift: ShiftType
    lineId: string
    position: string
  } | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<string>("")
  const [searchFilter, setSearchFilter] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("")
  const specialties = getSpecialties()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const handleToggleFullscreen = async () => {
    try {
      if (!isFullscreen && containerRef.current) {
        await containerRef.current.requestFullscreen()
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("[v0] Fullscreen error:", error)
    }
  }

  const handleStartEdit = () => {
    setEditedDays(JSON.parse(JSON.stringify(days)))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedDays(days)
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(editedDays)
    }
    setIsEditing(false)
  }

  const handleRemoveWorker = (date: string, shift: ShiftType, lineId: string, position: string) => {
    const newDays = editedDays.map((day) => {
      if (day.date === date && day.shift === shift) {
        return {
          ...day,
          assignments: day.assignments.filter(
            (a) => !(a.productionLineId === lineId && (a.positionName || "") === position),
          ),
        }
      }
      return day
    })
    setEditedDays(newDays)
  }

  const handleOpenAddWorker = (date: string, shift: ShiftType, lineId: string, position: string) => {
    setAddWorkerContext({ date, shift, lineId, position })
    setSelectedWorker("")
    setSearchFilter("")
    setSpecialtyFilter("")
    setShowAddWorker(true)
  }

  const handleAddWorker = () => {
    if (!addWorkerContext || !selectedWorker) return

    const { date, shift, lineId, position } = addWorkerContext

    const dayIndex = editedDays.findIndex((d) => d.date === date && d.shift === shift)
    const worker = workers.find((w) => w.id === selectedWorker)
    const line = productionLines.find((l) => l.id === lineId)

    if (!worker || !line) return

    const matchingReq = line.requirements.find((req) =>
      req.requiredSpecialties.some((rs) => worker.specialties.includes(rs.specialtyId)),
    )

    const productId = matchingReq?.productId || line.requirements[0]?.productId || ""

    const newAssignment: ShiftAssignment = {
      workerId: selectedWorker,
      productionLineId: lineId,
      productId,
      position: 1,
      positionName: position,
    }

    if (dayIndex >= 0) {
      const newDays = [...editedDays]
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        assignments: [...newDays[dayIndex].assignments, newAssignment],
      }
      setEditedDays(newDays)
    } else {
      const newDay: ScheduleDay = {
        date,
        shift,
        assignments: [newAssignment],
      }
      setEditedDays([...editedDays, newDay])
    }

    setShowAddWorker(false)
    setAddWorkerContext(null)
    setSelectedWorker("")
  }

  const getAvailableWorkers = () => {
    if (!addWorkerContext) return []

    const { date, shift } = addWorkerContext
    const dayData = editedDays.find((d) => d.date === date && d.shift === shift)
    const allocatedWorkerIds = dayData ? dayData.assignments.map((a) => a.workerId) : []

    let availableWorkers = workers.filter(
      (w) => !allocatedWorkerIds.includes(w.id) && w.availableShifts.includes(shift),
    )

    if (searchFilter.trim()) {
      const searchLower = searchFilter.toLowerCase()
      availableWorkers = availableWorkers.filter(
        (w) => w.name.toLowerCase().includes(searchLower) || w.employeeId.toLowerCase().includes(searchLower),
      )
    }

    if (specialtyFilter) {
      availableWorkers = availableWorkers.filter((w) => w.specialties.includes(specialtyFilter))
    }

    return availableWorkers
  }

  const handleToggleTraining = (date: string, shift: ShiftType, lineId: string, position: string) => {
    const newDays = editedDays.map((day) => {
      if (day.date === date && day.shift === shift) {
        const newAssignments = day.assignments.map((a) => {
          if (a.productionLineId === lineId && (a.positionName || "") === position) {
            return { ...a, isTraining: !a.isTraining }
          }
          return a
        })
        return { ...day, assignments: newAssignments }
      }
      return day
    })
    setEditedDays(newDays)
  }

  const currentDays = isEditing ? editedDays : days

  let filteredDays = currentDays
  if (viewMode === "daily" && selectedDate) {
    filteredDays = currentDays.filter((d) => d.date === selectedDate)
  }

  const sortedDates = [...new Set(filteredDays.map((d) => d.date))].sort()

  const weekDays = sortedDates.map((dateStr) => {
    const date = new Date(dateStr)
    return {
      date: dateStr,
      dayName:
        date.toLocaleDateString("pt-PT", { weekday: "long" }).charAt(0).toUpperCase() +
        date.toLocaleDateString("pt-PT", { weekday: "long" }).slice(1),
      shortDay: date.toLocaleDateString("pt-PT", { weekday: "short" }).toUpperCase(),
      fullDate: date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    }
  })

  // Coletar todos os postos únicos de todas as linhas
  const allPositions = new Map<string, Set<string>>() // lineId -> Set<positionName>

  productionLines.forEach((line) => {
    const positions = new Set<string>()
    line.requirements.forEach((req) => {
      req.requiredSpecialties.forEach((spec) => {
        if (spec.positions && spec.positions.length > 0) {
          spec.positions.forEach((pos) => positions.add(pos.name))
        } else {
          const specialty = specialties.find((s) => s.id === spec.specialtyId)
          if (specialty) positions.add(specialty.name)
        }
      })
    })
    allPositions.set(line.id, positions)
  })

  // Função para obter cor do operador baseado no nome
  const getWorkerColor = (workerId: string): string => {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) return "#E5E7EB"

    // Se tem cor da empresa, usar essa
    if (worker.companyColor) return worker.companyColor

    // Caso contrário, gerar cor baseada no hash do nome
    const colors = [
      "#A7F3D0", // verde claro
      "#BFDBFE", // azul claro
      "#FBB6CE", // rosa claro
      "#FED7AA", // laranja claro
      "#FDE68A", // amarelo claro
      "#DDD6FE", // roxo claro
      "#C7D2FE", // índigo claro
      "#FBCFE8", // pink claro
    ]

    let hash = 0
    for (let i = 0; i < worker.name.length; i++) {
      hash = worker.name.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-4 ${isFullscreen ? "bg-white dark:bg-black p-6 h-screen overflow-auto" : ""}`}
    >
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button onClick={handleStartEdit} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button onClick={handleToggleFullscreen} variant="outline" size="sm">
                {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
                {isFullscreen ? "Sair" : "Fullscreen"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </>
          )}
        </div>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {isEditing && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-xs print:hidden">
          Modo de Edição: Clique nas células para adicionar/remover operadores
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A3 landscape;
            margin: 0.5cm;
          }
        }
      `}</style>

      <div className="print-area overflow-x-auto">
        <div className="text-center mb-3 print:mb-2">
          <h2 className="text-xl font-bold print:text-2xl">W49</h2>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Linha 1: Dias da semana e datas */}
            <tr>
              <th
                rowSpan={2}
                className="bg-purple-900 text-white border border-gray-400 p-1 font-bold text-[10px] min-w-[120px] sticky left-0 z-10"
              >
                Postos de Trabalho
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.date}
                  colSpan={3}
                  className="bg-purple-900 text-white border border-gray-400 p-1 font-bold text-[10px]"
                >
                  <div>{day.shortDay}</div>
                  <div className="text-[9px] font-normal">{day.fullDate}</div>
                </th>
              ))}
            </tr>
            {/* Linha 2: T1, T2, T3 */}
            <tr>
              {weekDays.map((day) => (
                <>
                  <th
                    key={`${day.date}-t1`}
                    className="bg-purple-800 text-white border border-gray-400 p-1 font-semibold text-[9px] min-w-[100px]"
                  >
                    T1
                  </th>
                  <th
                    key={`${day.date}-t2`}
                    className="bg-purple-800 text-white border border-gray-400 p-1 font-semibold text-[9px] min-w-[100px]"
                  >
                    T2
                  </th>
                  <th
                    key={`${day.date}-t3`}
                    className="bg-purple-800 text-white border border-gray-400 p-1 font-semibold text-[9px] min-w-[100px]"
                  >
                    T3
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {productionLines.map((line) => {
              const linePositions = Array.from(allPositions.get(line.id) || [])

              return linePositions.map((position, posIndex) => (
                <tr key={`${line.id}-${position}`}>
                  {posIndex === 0 && (
                    <td
                      rowSpan={linePositions.length}
                      className="bg-gray-100 border border-gray-400 p-2 font-bold text-[10px] align-top sticky left-0 z-10"
                    >
                      <div className="transform rotate-0">{line.name.toUpperCase()}</div>
                    </td>
                  )}

                  {posIndex === 0 ? (
                    <td className="bg-orange-100 border border-gray-400 p-1 font-semibold text-[9px] align-top">
                      {position}
                    </td>
                  ) : (
                    <td className="bg-gray-50 border border-gray-400 p-1 text-[9px] align-top">{position}</td>
                  )}

                  {weekDays.map((day) => {
                    const shifts: ShiftType[] = ["morning", "afternoon", "night"]

                    return shifts.map((shift) => {
                      const dayData = filteredDays.find((d) => d.date === day.date && d.shift === shift)
                      const assignment = dayData?.assignments.find(
                        (a) => a.productionLineId === line.id && (a.positionName || "") === position,
                      )

                      const worker = assignment ? workers.find((w) => w.id === assignment.workerId) : null
                      const bgColor = worker ? getWorkerColor(assignment!.workerId) : "#FFFFFF"

                      return (
                        <td
                          key={`${day.date}-${shift}-${position}`}
                          className="border border-gray-400 p-0.5 text-[9px] relative group"
                          style={{ backgroundColor: bgColor }}
                        >
                          {worker ? (
                            <div className="relative">
                              <div className="font-medium">{worker.name}</div>
                              {assignment?.isTraining && (
                                <div className="text-[8px] text-orange-600 font-semibold">EM FORMAÇÃO</div>
                              )}
                              {isEditing && (
                                <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleToggleTraining(day.date, shift, line.id, position)}
                                    className="bg-orange-500 text-white p-0.5 rounded text-[8px] hover:bg-orange-600"
                                    title="Alternar formação"
                                  >
                                    <GraduationCap className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveWorker(day.date, shift, line.id, position)}
                                    className="bg-red-500 text-white p-0.5 rounded text-[8px] hover:bg-red-600"
                                    title="Remover"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            isEditing && (
                              <button
                                onClick={() => handleOpenAddWorker(day.date, shift, line.id, position)}
                                className="w-full h-full min-h-[24px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                title="Adicionar operador"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            )
                          )}
                        </td>
                      )
                    })
                  })}
                </tr>
              ))
            })}

            {/* Linha de totais */}
            <tr>
              <td
                colSpan={2}
                className="bg-purple-900 text-white border border-gray-400 p-1 font-bold text-[10px] text-center"
              >
                TOTAL
              </td>
              {weekDays.map((day) => {
                const shifts: ShiftType[] = ["morning", "afternoon", "night"]

                return shifts.map((shift) => {
                  const dayData = filteredDays.find((d) => d.date === day.date && d.shift === shift)
                  const total = dayData?.assignments.length || 0

                  return (
                    <td
                      key={`${day.date}-${shift}-total`}
                      className="bg-yellow-100 border border-gray-400 p-1 font-bold text-center text-[10px]"
                    >
                      {total}
                    </td>
                  )
                })
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dialog para adicionar operador */}
      <Dialog open={showAddWorker} onOpenChange={setShowAddWorker}>
        <DialogContent className="max-w-2xl print:hidden">
          <DialogHeader>
            <DialogTitle>Adicionar Operador</DialogTitle>
            <DialogDescription>
              Posto: {addWorkerContext?.position} | Turno:{" "}
              {addWorkerContext?.shift === "morning"
                ? "Manhã"
                : addWorkerContext?.shift === "afternoon"
                  ? "Tarde"
                  : "Noite"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pesquisar</Label>
                <Input
                  placeholder="Nome ou nº colaborador..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <div>
                <Label>Filtrar por Especialidade</Label>
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {specialties.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id}>
                        {spec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {getAvailableWorkers().map((worker) => (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorker(worker.id)}
                  className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${
                    selectedWorker === worker.id ? "bg-blue-50 border-blue-500" : ""
                  }`}
                >
                  <div className="font-medium">{worker.name}</div>
                  <div className="text-sm text-gray-600">Nº {worker.employeeId}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {worker.specialties.map((sId) => specialties.find((s) => s.id === sId)?.name).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWorker(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddWorker} disabled={!selectedWorker}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ScheduleBoardView
