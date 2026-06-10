"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyPlanGrid } from "@/components/production-plan/weekly-plan-grid"
import { ProductionPlanImporter } from "@/components/production-lines/production-plan-importer"
import { Plus, Trash2, FileText, Upload, Settings2, Check, Eye, EyeOff } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  const [isCreating, setIsCreating] = useState(false)

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

  const createNewPlan = async () => {
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

    setIsCreating(true)
    try {
      const newPlan = await addWeeklyPlan({
        name: planName,
        startDate: start.toISOString().split("T")[0],
        days,
      })

      const updatedPlans = [...weeklyPlans, newPlan]
      setWeeklyPlans(updatedPlans)
      setCurrentPlan(newPlan)
      setPlanName("")
      setStartDate("")
    } catch (error) {
      console.error("[v0] Error creating plan:", error)
      alert("Erro ao criar o plano. Por favor, tente novamente.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdatePlan = async (updatedPlan: WeeklyProductionPlan) => {
    try {
      await updateWeeklyPlan(updatedPlan.id, updatedPlan)
      setCurrentPlan(updatedPlan)
      setWeeklyPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)))
    } catch (error) {
      console.error("[v0] Error updating plan:", error)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (confirm("Tem certeza que deseja eliminar este plano?")) {
      try {
        await deleteWeeklyPlan(id)
        setWeeklyPlans((prev) => prev.filter((p) => p.id !== id))
        if (currentPlan?.id === id) {
          setCurrentPlan(null)
        }
      } catch (error) {
        console.error("[v0] Error deleting plan:", error)
      }
    }
  }

  // Função para alternar visibilidade de uma linha
  const toggleLineVisibility = async (lineId: string) => {
    if (!currentPlan) return

    const activeLines = productionLines.filter((l) => l.isActive !== false)
    const currentVisibleIds = currentPlan.visibleLineIds || activeLines.map((l) => l.id)
    
    let newVisibleIds: string[]
    if (currentVisibleIds.includes(lineId)) {
      // Remover linha (mas manter pelo menos uma)
      newVisibleIds = currentVisibleIds.filter((id) => id !== lineId)
      if (newVisibleIds.length === 0) {
        return // Não permitir esconder todas as linhas
      }
    } else {
      // Adicionar linha
      newVisibleIds = [...currentVisibleIds, lineId]
    }

    const updatedPlan = { ...currentPlan, visibleLineIds: newVisibleIds }
    await handleUpdatePlan(updatedPlan)
  }

  // Função para mostrar/esconder todas as linhas
  const toggleAllLines = async (show: boolean) => {
    if (!currentPlan) return

    const activeLines = productionLines.filter((l) => l.isActive !== false)
    const newVisibleIds = show ? activeLines.map((l) => l.id) : []
    
    // Se estiver a esconder todas, manter pelo menos a primeira
    if (newVisibleIds.length === 0 && activeLines.length > 0) {
      newVisibleIds.push(activeLines[0].id)
    }

    const updatedPlan = { ...currentPlan, visibleLineIds: newVisibleIds }
    await handleUpdatePlan(updatedPlan)
  }

  // Obter linhas visíveis para o plano atual
  const getVisibleLines = () => {
    const activeLines = productionLines.filter((l) => l.isActive !== false)
    if (!currentPlan?.visibleLineIds) {
      return activeLines
    }
    return activeLines.filter((l) => currentPlan.visibleLineIds!.includes(l.id))
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
                  <Button onClick={createNewPlan} className="w-full min-h-[44px]" disabled={isCreating || !planName || !startDate}>
                    {isCreating ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        A criar...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Plano
                      </>
                    )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>{currentPlan.name}</CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {new Date(currentPlan.startDate).toLocaleDateString("pt-PT")} -{" "}
                  {new Date(new Date(currentPlan.startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(
                    "pt-PT",
                  )}
                </div>
              </div>
              
              {/* Seletor de Linhas Visíveis */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Linhas Visíveis</span>
                    <span className="sm:hidden">Linhas</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                      {getVisibleLines().length}/{productionLines.filter((l) => l.isActive !== false).length}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-3 border-b">
                    <h4 className="font-medium text-sm">Linhas de Produção</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione as linhas a mostrar neste plano
                    </p>
                  </div>
                  
                  <div className="p-2 border-b flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 h-8 text-xs"
                      onClick={() => toggleAllLines(true)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Mostrar Todas
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 h-8 text-xs"
                      onClick={() => toggleAllLines(false)}
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Esconder Todas
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[250px]">
                    <div className="p-2 space-y-1">
                      {productionLines
                        .filter((l) => l.isActive !== false)
                        .map((line) => {
                          const isVisible = !currentPlan.visibleLineIds || currentPlan.visibleLineIds.includes(line.id)
                          return (
                            <button
                              key={line.id}
                              onClick={() => toggleLineVisibility(line.id)}
                              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                                isVisible 
                                  ? "bg-primary/10 hover:bg-primary/15" 
                                  : "hover:bg-muted"
                              }`}
                            >
                              <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                isVisible 
                                  ? "bg-primary border-primary" 
                                  : "border-input"
                              }`}>
                                {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{line.name}</div>
                                {line.description && (
                                  <div className="text-xs text-muted-foreground truncate">{line.description}</div>
                                )}
                              </div>
                              {isVisible ? (
                                <Eye className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </button>
                          )
                        })}
                    </div>
                  </ScrollArea>
                  
                  <Separator />
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    {getVisibleLines().length} de {productionLines.filter((l) => l.isActive !== false).length} linhas visíveis
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyPlanGrid
              plan={currentPlan}
              productionLines={getVisibleLines()}
              products={products}
              onUpdate={handleUpdatePlan}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
