"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyPlanGrid } from "@/components/production-plan/weekly-plan-grid"
import { ProductionPlanImporter } from "@/components/production-lines/production-plan-importer"
import { Plus, Trash2, FileText, Upload } from "lucide-react"
import {
  getProductionLines,
  getProducts,
  getWeeklyPlans,
  addWeeklyPlan,
  updateWeeklyPlan,
  deleteWeeklyPlan,
  loadProductionLines,
  loadProducts,
  loadWeeklyPlans,
} from "@/lib/storage"
import type { WeeklyProductionPlan, ProductionLine, Product, DailyProductionPlan, ShiftType } from "@/lib/types"

export function WeeklyPlanManagement() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyProductionPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<WeeklyProductionPlan | null>(null)
  const [planName, setPlanName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        await Promise.all([loadProductionLines(), loadProducts(), loadWeeklyPlans()])
        setProductionLines(getProductionLines())
        setProducts(getProducts())
        const plans = getWeeklyPlans()
        setWeeklyPlans(plans)
        if (plans.length > 0) {
          setCurrentPlan(plans[plans.length - 1])
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const createNewPlan = () => {
    if (!planName || !startDate) return

    const start = new Date(startDate + "T00:00:00")

    if (isNaN(start.getTime())) {
      alert("Data inválida. Por favor, selecione uma data válida.")
      return
    }

    const days: DailyProductionPlan[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      days.push({
        date: date.toISOString().split("T")[0],
        shifts: [
          { shift: "morning" as ShiftType, entries: [] },
          { shift: "afternoon" as ShiftType, entries: [] },
          { shift: "night" as ShiftType, entries: [] },
        ],
      })
    }

    const newPlan = addWeeklyPlan({
      name: planName,
      startDate: start.toISOString().split("T")[0],
      days,
    })

    const updatedPlans = [...weeklyPlans, newPlan]
    setWeeklyPlans(updatedPlans)
    setCurrentPlan(newPlan)
    setPlanName("")
    setStartDate("")
  }

  const handleUpdatePlan = (updatedPlan: WeeklyProductionPlan) => {
    updateWeeklyPlan(updatedPlan.id, updatedPlan)
    setCurrentPlan(updatedPlan)
    setWeeklyPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)))
  }

  const handleDeletePlan = (id: string) => {
    if (confirm("Tem certeza que deseja eliminar este plano?")) {
      deleteWeeklyPlan(id)
      setWeeklyPlans((prev) => prev.filter((p) => p.id !== id))
      if (currentPlan?.id === id) {
        setCurrentPlan(null)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Gestão de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="manual" className="text-sm sm:text-base">
                <FileText className="h-4 w-4 mr-2" />
                Criar Manual
              </TabsTrigger>
              <TabsTrigger value="import" className="text-sm sm:text-base">
                <Upload className="h-4 w-4 mr-2" />
                Importar Plano
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ex: Semana 1 - Janeiro 2024"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createNewPlan} className="w-full min-h-[44px]">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Plano
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="import">
              <ProductionPlanImporter />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {weeklyPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planos Guardados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weeklyPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    currentPlan?.id === plan.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                  }`}
                >
                  <button onClick={() => setCurrentPlan(plan)} className="flex-1 text-left">
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(plan.startDate).toLocaleDateString("pt-PT")} -{" "}
                      {new Date(new Date(plan.startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(
                        "pt-PT",
                      )}
                    </div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentPlan.name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {new Date(currentPlan.startDate).toLocaleDateString("pt-PT")} -{" "}
                {new Date(new Date(currentPlan.startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(
                  "pt-PT",
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyPlanGrid
              plan={currentPlan}
              productionLines={productionLines}
              products={products}
              onUpdate={handleUpdatePlan}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
