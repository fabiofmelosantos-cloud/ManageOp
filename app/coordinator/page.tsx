"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Clock, ChevronDown, ChevronUp, Settings2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedAdherenceCalculator } from "@/components/coordinator/enhanced-adherence-calculator"
import { OperationalSummaryForm, initialOperationalFormData } from "@/components/coordinator/operational-summary-form"
import type { OperationalFormData } from "@/components/coordinator/operational-summary-form"
import { WorkforceDistributionPanel } from "@/components/coordinator/workforce-distribution-panel"
import { LinesDashboard } from "@/components/coordinator/lines-dashboard"
import { FinalReportGenerator } from "@/components/coordinator/final-report-generator"
import { NotificationSummaryPanel } from "@/components/coordinator/notification-summary-panel"
import { getProductionLines, getWorkers, getSchedules, loadWeeklyPlans, getWeeklyPlans, getProducts } from "@/lib/storage"
import { loadProductionLines, loadWorkers, loadSchedules, loadProducts } from "@/lib/storage"
import { getShiftLabel } from "@/lib/shift-utils"
import type {
  ProductionLine,
  Worker,
  Schedule,
  ShiftType,
  WeeklyProductionPlan,
  ManualAdherenceEntry,
  SafetyQualityRecord,
  CostDeliveryRecord,
  WorkforceRecord,
  WorkforceDistribution,
  LineStatusEntry,
  NotificationSummary,
  Product,
} from "@/lib/types"
import { useAuth } from "@/lib/auth-context"

export default function CoordinatorPage() {
  const { userProfile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [currentShift, setCurrentShift] = useState<ShiftType>("morning")
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyProductionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("adherence")

  // Report data state
  const [manualEntries, setManualEntries] = useState<ManualAdherenceEntry[]>([])
  const [adherenceData, setAdherenceData] = useState<{
    entries: ManualAdherenceEntry[]
    overallAdherence: number
  }>({ entries: [], overallAdherence: 0 })
  const [safetyQuality, setSafetyQuality] = useState<SafetyQualityRecord | undefined>()
  const [costDelivery, setCostDelivery] = useState<CostDeliveryRecord | undefined>()
  const [workforce, setWorkforce] = useState<WorkforceRecord | undefined>()
  const [workforceDistribution, setWorkforceDistribution] = useState<WorkforceDistribution[]>([])
  const [lineStatuses, setLineStatuses] = useState<LineStatusEntry[]>([])
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary | undefined>()
  const [operationalFormData, setOperationalFormData] = useState<OperationalFormData>(initialOperationalFormData)
  const [operationalSummary, setOperationalSummary] = useState("")
  const [sapSummary, setSapSummary] = useState("")

  const loadData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([loadProductionLines(), loadWorkers(), loadSchedules(), loadWeeklyPlans(), loadProducts()])
      const [linesData, workersData, schedulesData, productsData] = await Promise.all([
        getProductionLines(),
        getWorkers(),
        getSchedules(),
        getProducts(),
      ])
      const plans = getWeeklyPlans()
      setProductionLines(linesData)
      setProducts(productsData)
      setWorkers(workersData)
      setSchedules(schedulesData)
      setWeeklyPlan(plans.length > 0 ? plans[plans.length - 1] : null)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-detect shift based on current time
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    if (hour >= 8 && hour < 16) {
      setCurrentShift("morning")
    } else if (hour >= 16 && hour < 24) {
      setCurrentShift("afternoon")
    } else {
      setCurrentShift("night")
    }
  }, [])

  const handleManualEntriesChange = useCallback((entries: ManualAdherenceEntry[]) => {
    setManualEntries(entries)
  }, [])

  const handleAdherenceUpdate = useCallback((entries: ManualAdherenceEntry[], overallAdherence: number) => {
    setAdherenceData({ entries, overallAdherence })
  }, [])

  const handleOperationalFormDataChange = useCallback((data: OperationalFormData) => {
    setOperationalFormData(data)
  }, [])

  const handleOperationalUpdate = useCallback(
    (data: {
      safetyQuality: SafetyQualityRecord
      costDelivery: CostDeliveryRecord
      workforce: WorkforceRecord
      generatedSummary: string
      sapSummary: string
    }) => {
      setSafetyQuality(data.safetyQuality)
      setCostDelivery(data.costDelivery)
      setWorkforce(data.workforce)
      setOperationalSummary(data.generatedSummary)
      setSapSummary(data.sapSummary)
    },
    []
  )

  const handleDistributionUpdate = useCallback((distribution: WorkforceDistribution[]) => {
    setWorkforceDistribution(distribution)
  }, [])

  const handleStatusUpdate = useCallback((statuses: LineStatusEntry[]) => {
    setLineStatuses(statuses)
  }, [])

  const handleNotificationSummaryUpdate = useCallback((summary: NotificationSummary) => {
    setNotificationSummary(summary)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 bg-background pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Quadro do Coordenador</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bem-vindo, <span className="font-semibold">{userProfile?.name || "Coordenador"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          </div>
        </div>
      </div>

      {/* Configuration Panel - Collapsible */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen} className="mb-4">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Configuracao do Turno
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">
                    {new Date(selectedDate).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getShiftLabel(currentShift)}
                  </Badge>
                  {configOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Data</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-10 min-h-[48px] text-sm touch-manipulation"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Turno</Label>
                  <Select value={currentShift} onValueChange={(value) => setCurrentShift(value as ShiftType)}>
                    <SelectTrigger className="min-h-[48px] text-sm touch-manipulation">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning" className="min-h-[44px]">
                        {getShiftLabel("morning")}
                      </SelectItem>
                      <SelectItem value="afternoon" className="min-h-[44px]">
                        {getShiftLabel("afternoon")}
                      </SelectItem>
                      <SelectItem value="night" className="min-h-[44px]">
                        {getShiftLabel("night")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/80">
          <TabsTrigger value="adherence" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Aderencia</span>
            <span className="sm:hidden">Ader.</span>
          </TabsTrigger>
          <TabsTrigger value="lines" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Linhas</span>
            <span className="sm:hidden">Lin.</span>
          </TabsTrigger>
          <TabsTrigger value="notify" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Notificar</span>
            <span className="sm:hidden">Not.</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Resumo</span>
            <span className="sm:hidden">Res.</span>
          </TabsTrigger>
          <TabsTrigger value="mod" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            MOD
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs sm:text-sm py-2.5 px-1 sm:px-3 data-[state=active]:bg-background">
            <span className="hidden sm:inline">Relatorio</span>
            <span className="sm:hidden">Rel.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="adherence" className="space-y-4 mt-0">
          <EnhancedAdherenceCalculator
            productionLines={productionLines}
            weeklyPlan={weeklyPlan}
            selectedDate={selectedDate}
            selectedShift={currentShift}
            manualEntries={manualEntries}
            onManualEntriesChange={handleManualEntriesChange}
            onAdherenceUpdate={handleAdherenceUpdate}
          />
        </TabsContent>

        <TabsContent value="lines" className="space-y-4 mt-0">
          <LinesDashboard
            productionLines={productionLines}
            products={products}
            selectedDate={selectedDate}
            selectedShift={currentShift}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>

        <TabsContent value="notify" className="space-y-4 mt-0">
          <NotificationSummaryPanel
            lineStatuses={lineStatuses}
            selectedDate={selectedDate}
            selectedShift={currentShift}
            coordinatorName={userProfile?.name || "Coordenador"}
            onSummaryUpdate={handleNotificationSummaryUpdate}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-0">
          <OperationalSummaryForm
            date={selectedDate}
            shift={currentShift}
            formData={operationalFormData}
            onFormDataChange={handleOperationalFormDataChange}
            onUpdate={handleOperationalUpdate}
          />
        </TabsContent>

        <TabsContent value="mod" className="space-y-4 mt-0">
          <WorkforceDistributionPanel
            workers={workers}
            productionLines={productionLines}
            schedules={schedules}
            selectedDate={selectedDate}
            selectedShift={currentShift}
            onDistributionUpdate={handleDistributionUpdate}
          />
        </TabsContent>

        <TabsContent value="report" className="space-y-4 mt-0">
          <FinalReportGenerator
            date={selectedDate}
            shift={currentShift}
            coordinatorName={userProfile?.name || "Coordenador"}
            adherenceData={adherenceData}
            safetyQuality={safetyQuality}
            costDelivery={costDelivery}
            workforce={workforce}
            workforceDistribution={workforceDistribution}
            lineStatuses={lineStatuses}
            operationalSummary={operationalSummary}
            sapSummary={sapSummary}
          />
        </TabsContent>
      </Tabs>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-2 sm:hidden z-50">
        <div className="flex justify-around">
          {[
            { id: "adherence", label: "Aderencia", short: "Ader." },
            { id: "lines", label: "Linhas", short: "Lin." },
            { id: "notify", label: "Notificar", short: "Not." },
            { id: "summary", label: "Resumo", short: "Res." },
            { id: "mod", label: "MOD", short: "MOD" },
            { id: "report", label: "Relatorio", short: "Rel." },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 mx-0.5 min-h-[44px] text-xs"
            >
              {tab.short}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
