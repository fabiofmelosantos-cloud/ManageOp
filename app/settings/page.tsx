"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Package, Calendar, ClipboardList, UserCog, Trash2, Plus } from "lucide-react"
import WorkersPage from "@/app/workers/page"
import ProductionLinesPage from "@/app/production-lines/page"
import { ScheduleGeneratorForm } from "@/components/schedule/schedule-generator-form"
import { TaskGeneratorPanel } from "@/components/schedule/task-generator-panel"
import { WeeklyPlanManagement } from "@/components/production-plan/weekly-plan-management"
import { HRManagementPanel } from "@/components/hr/hr-management-panel"
import { IncidentEvaluationBoard } from "@/components/hr/incident-evaluation-board"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("")
  const [spreadsheetSaved, setSpreadsheetSaved] = useState(false)
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [productError, setProductError] = useState("")

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
          loadSpreadsheetSettings,
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

        const spreadsheet = await loadSpreadsheetSettings()
        setSpreadsheetUrl(spreadsheet.url)

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

  const handleAddProduct = async () => {
    const name = productName.trim()
    if (!name) {
      setProductError("Indique o nome do produto.")
      return
    }
    if (products.some((product) => product.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setProductError("Já existe um produto com este nome.")
      return
    }
    setIsSavingProduct(true)
    setProductError("")
    try {
      const { addProduct, loadProducts, getProducts } = await import("@/lib/storage")
      await addProduct({ name, description: productDescription.trim() || undefined })
      await loadProducts()
      setProducts(getProducts())
      setProductName("")
      setProductDescription("")
    } catch {
      setProductError("Não foi possível guardar o produto. Tente novamente.")
    } finally {
      setIsSavingProduct(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Eliminar o produto ${product.name}?`)) return
    const { deleteProduct, loadProducts, getProducts } = await import("@/lib/storage")
    await deleteProduct(product.id)
    await loadProducts()
    setProducts(getProducts())
  }

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule)
    setGenerationConfig({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      shifts: ["morning"],
    })
    setGeneratedDays(schedule.days)
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
        const days = generateSchedule(config, workers, productionLines, productionPlan ?? undefined, specialties)
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

        <Card>
          <CardHeader>
            <CardTitle>Fonte de dados da empresa</CardTitle>
            <CardDescription>Link Excel/CSV em modo apenas leitura para Planeamento, Horário, Férias, Suporte e Tarefas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input value={spreadsheetUrl} onChange={(event) => setSpreadsheetUrl(event.target.value)} placeholder="https://empresa.pt/ficheiros/operacoes.xlsx" type="url" aria-label="Link da planilha" />
            <Button onClick={async () => { const { saveSpreadsheetSettings } = await import("@/lib/storage"); await saveSpreadsheetSettings(spreadsheetUrl); setSpreadsheetSaved(true); setTimeout(() => setSpreadsheetSaved(false), 2500) }}>
              {spreadsheetSaved ? "Guardado" : "Guardar link"}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:grid sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 sm:gap-2">
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
                value="products"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" aria-hidden="true" />
                Produtos
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

          <TabsContent value="products" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Novo produto</CardTitle>
                  <CardDescription>Adicione produtos para utilizar no planeamento e na produção.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="product-name" className="text-sm font-medium">Nome do produto</label>
                    <Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Ex.: Produto acabado A" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="product-description" className="text-sm font-medium">Descrição (opcional)</label>
                    <Input id="product-description" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Descrição ou referência interna" />
                  </div>
                  {productError && <p role="alert" className="text-sm text-destructive">{productError}</p>}
                  <Button onClick={() => void handleAddProduct()} disabled={isSavingProduct}>
                    <Plus data-icon="inline-start" />{isSavingProduct ? "A guardar..." : "Criar produto"}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Produtos registados</CardTitle>
                  <CardDescription>{products.length} produto(s) disponível(eis) no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Ainda não existem produtos registados.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.description && <p className="text-sm text-muted-foreground truncate">{product.description}</p>}
                          </div>
                          <Button variant="ghost" size="icon" aria-label={`Eliminar ${product.name}`} onClick={() => void handleDeleteProduct(product)}>
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

              <TaskGeneratorPanel workers={workers} />

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
<div className="space-y-6"><HRManagementPanel /><IncidentEvaluationBoard /></div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
