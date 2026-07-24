"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { WeeklyPlanGrid } from "@/components/production-plan/weekly-plan-grid"
import { FileText, Filter } from "lucide-react"
import {
  getProductionLines,
  getProducts,
  getWeeklyPlans,
  loadProductionLines,
  loadProducts,
  loadWeeklyPlans,
} from "@/lib/storage"
import type { WeeklyProductionPlan, ProductionLine, Product, ShiftType } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ProductionPlanPage() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyProductionPlan[]>([])
  const [viewingPlan, setViewingPlan] = useState<WeeklyProductionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<ShiftType | "all">("all")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        await Promise.all([loadProductionLines(), loadProducts(), loadWeeklyPlans()])
        setProductionLines(getProductionLines())
        setProducts(getProducts())
        const plans = getWeeklyPlans()
        setWeeklyPlans(plans)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">A carregar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border-2 border-primary/20">
          <h1 className="text-2xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Planos de Produção
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground mt-2 sm:mt-3">Consulte os planos semanais guardados</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para criar ou editar planos de produção, aceda às <strong>Configurações</strong>.
          </AlertDescription>
        </Alert>

        {weeklyPlans.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Nenhum plano de produção encontrado.</p>
                <p className="text-sm text-muted-foreground">Crie um novo plano nas Configurações.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {weeklyPlans.map((plan) => (
              <Card
                key={plan.id}
                className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all active:scale-[0.99]"
                onClick={() => {
                  setViewingPlan(plan)
                  setSelectedShift("all")
                  setSelectedDay(null)
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {plan.name}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {new Date(plan.startDate).toLocaleDateString("pt-PT")} -{" "}
                      {new Date(new Date(plan.startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(
                        "pt-PT",
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={!!viewingPlan}
          onOpenChange={(open) => {
            if (!open) {
              setViewingPlan(null)
              setSelectedShift("all")
              setSelectedDay(null)
            }
          }}
        >
          <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none">
            <div className="h-full flex flex-col bg-background">
              <DialogHeader className="p-3 sm:p-4 border-b shrink-0 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base sm:text-xl truncate flex-1">{viewingPlan?.name}</DialogTitle>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${selectedShift !== "all" ? "bg-primary/10 border-primary" : "bg-transparent"}`}
                        >
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
                  </div>
                </div>

                {/* Indicador de filtro ativo */}
                {(selectedShift !== "all" || selectedDay !== null) && (
                  <div className="flex gap-2 pt-2 flex-wrap">
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
                    {selectedDay !== null && viewingPlan && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs">
                        <span>
                          {new Date(
                            new Date(viewingPlan.startDate).getTime() + selectedDay * 24 * 60 * 60 * 1000,
                          ).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
                        </span>
                        <button onClick={() => setSelectedDay(null)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-auto p-3 sm:p-6">
                {viewingPlan && (
                  <WeeklyPlanGrid
                    plan={viewingPlan}
                    productionLines={productionLines}
                    products={products}
                    readOnly
                    shiftFilter={selectedShift}
                    dayFilter={selectedDay !== null ? selectedDay : "all"}
                    onDayClick={(dayIndex) => setSelectedDay(dayIndex === selectedDay ? null : dayIndex)}
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
