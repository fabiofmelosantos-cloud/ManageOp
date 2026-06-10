"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Package, Calendar, ClipboardList, UserCog, Trash2 } from "lucide-react"
import WorkersPage from "@/app/workers/page"
import ProductionLinesPage from "@/app/production-lines/page"
import { ScheduleGeneratorForm } from "@/components/schedule/schedule-generator-form"
import { WeeklyPlanManagement } from "@/components/production-plan/weekly-plan-management"
import { HRManagementPanel } from "@/components/hr/hr-management-panel"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type {
  Worker,
  ProductionLine,
  Product,
  ScheduleGenerationConfig,
  ScheduleDay,
  Specialty,
  WeeklyProductionPlan,
} from "@/lib/types"

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyProductionPlan[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [generatedDays, setGeneratedDays] = useState<ScheduleDay[] | null>(null)
  const [generationConfig, setGenerationConfig] = useState<ScheduleGenerationConfig | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const loadData = async () => {
      try {
        const {
          loadWorkers,
          loadProductionLines,
          loadProducts,
          loadSpecialties,
          loadWeeklyPlans,
          loadSchedules,
          getWorkers,
          getProductionLines,
          getProducts,
          getSpecialties,
          getWeeklyPlans,
          getSchedules,
        } = await import("@/lib/storage")

        const { validateScheduleGeneration } = await import("@/lib/schedule-generator")

        await Promise.all([
          loadWorkers(),
          loadProductionLines(),
          loadProducts(),
          loadSpecialties(),
          loadWeeklyPlans(),
          loadSchedules(),
        ])

        const loadedWorkers = getWorkers()
        const loadedLines = getProductionLines()
        const loadedProducts = getProducts()
        const loadedSpecialties = getSpecialties()
        const loadedPlans = getWeeklyPlans()
        const loadedSchedules = getSchedules()

        setWorkers(loadedWorkers)
        setProductionLines(loadedLines)
        setProducts(loadedProducts)
        setSpecialties(loadedSpecialties)
        setWeeklyPlans(loadedPlans)
        setSchedules(loadedSchedules)
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [mounted])

  const handleEditSchedule = (schedule: any) => {
    console.log("[v0] handleEditSchedule called with schedule:", schedule)
    setEditingSchedule(schedule)
    setGenerationConfig({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      autoAssign: true,
      considerSkills: true,
    })
    setGeneratedDays(schedule.days)
    console.log("[v0] Edit mode activated, config set")
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (confirm("Tem certeza que deseja eliminar esta escala?")) {
      const { deleteSchedule, loadSchedules, getSchedules } = await import("@/lib/storage")
      await deleteSchedule(scheduleId)
      await loadSchedules()
      setSchedules(getSchedules())
    }
  }

  const handleGenerate = async (config: ScheduleGenerationConfig) => {
    setIsGenerating(true)
    setGenerationConfig(config)

    setTimeout(async () => {
      try {
        const { generateSchedule } = await import("@/lib/schedule-generator")
        const { getLatestWeeklyPlan } = await import("@/lib/storage")

        const productionPlan = getLatestWeeklyPlan()
        const days = generateSchedule(config, workers, productionLines, productionPlan, specialties)
        setGeneratedDays(days)

        const { addSchedule, updateSchedule, loadSchedules, getSchedules } = await import("@/lib/storage")

        if (editingSchedule) {
          await updateSchedule(editingSchedule.id, {
            ...editingSchedule,
            startDate: config.startDate,
            endDate: config.endDate,
            days,
          })
          alert("Escala atualizada com sucesso!")
          setEditingSchedule(null)
        } else {
          await addSchedule({
            name: `Escala ${new Date(config.startDate).toLocaleDateString("pt-PT")} - ${new Date(config.endDate).toLocaleDateString("pt-PT")}`,
            startDate: config.startDate,
            endDate: config.endDate,
            days,
          })
          alert("Escala gerada e guardada com sucesso!")
        }

        // Recarregar escalas
        await loadSchedules()
        setSchedules(getSchedules())

        setGeneratedDays(null)
        setGenerationConfig(null)
      } catch (error) {
        console.error("Error generating schedule:", error)
        setValidationErrors(["Erro ao gerar escala. Verifique os dados e tente novamente."])
      } finally {
        setIsGenerating(false)
      }
    }, 500)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="container mx-auto py-3 sm:py-8 px-2 sm:px-4 space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-lg sm:rounded-2xl p-3 sm:p-8 border-2 border-primary/20">
          <h1 className="text-xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-3">
            Gestão de trabalhadores, linhas, planos e geração de escalas
          </p>
        </div>

        <Tabs defaultValue="workers" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:grid sm:grid-cols-2 lg:grid-cols-5 h-auto gap-1 sm:gap-2">
              <TabsTrigger
                value="workers"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Trabalhadores
              </TabsTrigger>
              <TabsTrigger
                value="lines"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Linhas
              </TabsTrigger>
              <TabsTrigger
                value="generate"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Gerar Escala
              </TabsTrigger>
              <TabsTrigger
                value="weekly-plan"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Plano Semanal
              </TabsTrigger>
              <TabsTrigger
                value="hr"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                RH
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workers" className="mt-6">
            <WorkersPage />
          </TabsContent>

          <TabsContent value="lines" className="mt-6">
            <ProductionLinesPage />
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingSchedule ? "Editar Escala" : "Gerar Nova Escala"}</CardTitle>
                  <CardDescription>
                    {editingSchedule
                      ? "Modifique as configurações e regenere a escala"
                      : "Configure e gere automaticamente uma nova escala de trabalho"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduleGeneratorForm
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    errors={validationErrors}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Escalas Criadas</CardTitle>
                  <CardDescription>Visualize ou edite escalas já criadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma escala criada ainda</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {schedules.map((schedule) => (
                        <Card key={schedule.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{schedule.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(schedule.startDate).toLocaleDateString("pt-PT")} -{" "}
                              {new Date(schedule.endDate).toLocaleDateString("pt-PT")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSchedule(schedule)}
                              className="flex-1"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weekly-plan" className="mt-6">
            <WeeklyPlanManagement />
          </TabsContent>

          <TabsContent value="hr" className="mt-6">
            <HRManagementPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
