"use client"

import { useState, useEffect } from "react"
import { ScheduleList } from "@/components/schedule/schedule-list"
import { SchedulePreview } from "@/components/schedule/schedule-preview"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Filter, Maximize2 } from "lucide-react"
import type { Worker, ProductionLine, Product, Schedule, ShiftType } from "@/lib/types"

export default function SchedulesViewPage() {
  const [mounted, setMounted] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [savedSchedules, setSavedSchedules] = useState<Schedule[]>([])
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null)
  const [selectedShift, setSelectedShift] = useState<ShiftType | "all">("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const loadData = async () => {
      try {
        const { loadWorkers, loadProductionLines, loadProducts, loadSchedules } = await import("@/lib/storage")
        const { getWorkers, getProductionLines, getProducts, getSchedules } = await import("@/lib/storage")

        await Promise.all([loadWorkers(), loadProductionLines(), loadProducts(), loadSchedules()])

        setWorkers(getWorkers())
        setProductionLines(getProductionLines())
        setProducts(getProducts())
        setSavedSchedules(getSchedules().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [mounted])

  const handleDeleteSchedule = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta escala?")) {
      const { deleteSchedule, getSchedules, loadSchedules } = await import("@/lib/storage")
      await deleteSchedule(id)
      await loadSchedules()
      setSavedSchedules(getSchedules().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }
  }

  const handleViewSchedule = (schedule: Schedule) => {
    setViewingSchedule(schedule)
    setSelectedDate(undefined)
    setSelectedShift("all")
    setIsFullscreen(false)
  }

  const handleExportSchedule = async (schedule: Schedule) => {
    const { exportScheduleToExcel } = await import("@/lib/excel-utils")
    const { getSpecialties } = await import("@/lib/storage")
    const specialties = getSpecialties()
    exportScheduleToExcel(schedule, workers, productionLines, products, specialties)
  }

  const selectedDayIndex =
    selectedDate && viewingSchedule
      ? viewingSchedule.days.findIndex((day) => {
          const dayDate = new Date(day.date)
          return dayDate.toDateString() === selectedDate.toDateString()
        })
      : undefined

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">A carregar...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border-2 border-primary/20">
          <h1 className="text-2xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Visualizar Escalas
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground mt-2 sm:mt-3">Consulte as escalas guardadas</p>
        </div>

        <ScheduleList
          schedules={savedSchedules}
          workers={workers}
          productionLines={productionLines}
          products={products}
          onView={handleViewSchedule}
          onExport={handleExportSchedule}
          onDelete={handleDeleteSchedule}
          readOnly
        />

        <Dialog
          open={!!viewingSchedule}
          onOpenChange={(open) => {
            if (!open) {
              setViewingSchedule(null)
              setSelectedDate(undefined)
              setSelectedShift("all")
              setIsFullscreen(false)
            }
          }}
        >
          <DialogContent
            className={
              isFullscreen
                ? "w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none"
                : "w-[95vw] h-[90vh] max-w-7xl p-0"
            }
          >
            <div className="h-full flex flex-col bg-background">
              <DialogHeader className="p-3 sm:p-4 border-b shrink-0 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base sm:text-xl truncate flex-1">{viewingSchedule?.name}</DialogTitle>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0 bg-transparent">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => {
                            if (!viewingSchedule) return true
                            return !viewingSchedule.days.some((day) => {
                              const dayDate = new Date(day.date)
                              return dayDate.toDateString() === date.toDateString()
                            })
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0 bg-transparent">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="end">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Filtrar Turno</p>
                          <div className="space-y-1">
                            {["all", "morning", "afternoon", "night"].map((shift) => (
                              <Button
                                key={shift}
                                variant={selectedShift === shift ? "default" : "ghost"}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSelectedShift(shift as ShiftType | "all")}
                              >
                                {shift === "all"
                                  ? "Todos"
                                  : shift === "morning"
                                    ? "Manhã"
                                    : shift === "afternoon"
                                      ? "Tarde"
                                      : "Noite"}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 sm:h-10 sm:w-10 p-0 bg-transparent"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(selectedDate || selectedShift !== "all") && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedDate && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{selectedDate.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</span>
                        <button onClick={() => setSelectedDate(undefined)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </div>
                    )}
                    {selectedShift !== "all" && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs">
                        <Filter className="h-3 w-3" />
                        <span>
                          {selectedShift === "morning" ? "Manhã" : selectedShift === "afternoon" ? "Tarde" : "Noite"}
                        </span>
                        <button onClick={() => setSelectedShift("all")} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                {viewingSchedule && (
                  <SchedulePreview
                    days={viewingSchedule.days}
                    workers={workers}
                    productionLines={productionLines}
                    products={products}
                    scheduleName={viewingSchedule.name}
                    startDate={viewingSchedule.startDate}
                    endDate={viewingSchedule.endDate}
                    shiftFilter={selectedShift}
                    dayFilter={selectedDayIndex !== undefined && selectedDayIndex >= 0 ? selectedDayIndex : "all"}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
