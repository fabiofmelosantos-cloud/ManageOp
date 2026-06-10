"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Factory, Users, TrendingUp, AlertCircle } from "lucide-react"
import { useDateContext } from "@/components/layout/app-header"
import { getSupabase } from "@/lib/supabase-client"

type WorkerDetail = {
  id: string
  name: string
  employee_id: string
  status: "working" | "absent" | "dc" | "vacation"
  shift?: string
  specialty?: string
  line?: string
}

type LineDetail = {
  id: string
  name: string
  description: string
  product: string
  productDescription: string
  workers: Array<{ name: string; specialty: string }>
  produced: number
  target: number
}

export default function DashboardPage() {
  const { selectedDate } = useDateContext()
  const [selectedShift, setSelectedShift] = useState<"morning" | "afternoon" | "night">("morning")

  const [selectedWorkerStatus, setSelectedWorkerStatus] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [workerDetails, setWorkerDetails] = useState<WorkerDetail[]>([])
  const [lineDetail, setLineDetail] = useState<LineDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const [productionLines, setProductionLines] = useState<any[]>([])
  const [workerStats, setWorkerStats] = useState<any>({
    morning: { working: 0, absent: 0, dc: 0, vacation: 0 },
    afternoon: { working: 0, absent: 0, dc: 0, vacation: 0 },
    night: { working: 0, absent: 0, dc: 0, vacation: 0 },
  })

  useEffect(() => {
    loadProductionData()
  }, [selectedDate])

  const loadProductionData = async () => {
    const supabase = getSupabase()

    // Buscar planos do dia selecionado
    const { data: dailyPlans } = await supabase
      .from("daily_plans")
      .select(`
        id,
        shift_plans (
          id,
          line_id,
          product_id,
          target_quantity,
          shift,
          line:production_lines (id, name, description),
          product:products (id, name, description),
          production_tracking (produced_quantity, is_running)
        )
      `)
      .eq("date", selectedDate.toISOString().split("T")[0])

    if (dailyPlans && dailyPlans.length > 0) {
      // Processar dados das linhas
      const linesMap = new Map()

      dailyPlans[0].shift_plans?.forEach((plan: any) => {
        const lineId = plan.line_id
        if (!linesMap.has(lineId)) {
          const tracking = plan.production_tracking?.[0]
          linesMap.set(lineId, {
            id: lineId,
            name: plan.line?.name || "Linha",
            product: plan.product?.name || "Produto",
            productDescription: plan.product?.description || "",
            isRunning: tracking?.is_running || false,
            produced: Number(tracking?.produced_quantity || 0),
            target: Number(plan.target_quantity || 0),
            progress: tracking?.produced_quantity
              ? (Number(tracking.produced_quantity) / Number(plan.target_quantity)) * 100
              : 0,
          })
        }
      })

      setProductionLines(Array.from(linesMap.values()))
    }

    // Carregar estatísticas de trabalhadores
    await loadWorkerStats()
  }

  const loadWorkerStats = async () => {
    const supabase = getSupabase()

    // Buscar schedule do dia
    const { data: scheduleDays } = await supabase
      .from("schedule_days")
      .select(`
        id,
        shift,
        shift_assignments (
          worker:workers (id, name, employee_id, specialties)
        )
      `)
      .eq("date", selectedDate.toISOString().split("T")[0])

    // Buscar ausências
    const { data: absences } = await supabase
      .from("absences")
      .select("worker_id, reason")
      .eq("created_at::date", selectedDate.toISOString().split("T")[0])

    // Processar estatísticas por turno
    const stats = {
      morning: { working: 0, absent: 0, dc: 0, vacation: 0 },
      afternoon: { working: 0, absent: 0, dc: 0, vacation: 0 },
      night: { working: 0, absent: 0, dc: 0, vacation: 0 },
    }

    scheduleDays?.forEach((day: any) => {
      const shift = day.shift as "morning" | "afternoon" | "night"
      if (stats[shift]) {
        stats[shift].working += day.shift_assignments?.length || 0
      }
    })

    absences?.forEach((absence: any) => {
      // Simplificação: considerar todas ausências como faltas
      // Em produção, verificar o reason para categorizar
      const shift = "morning" // Precisaria determinar o turno do trabalhador
      if (stats[shift]) {
        stats[shift].absent += 1
      }
    })

    setWorkerStats(stats)
  }

  const loadWorkerDetails = async (status: string) => {
    setLoading(true)
    const supabase = getSupabase()

    const shiftMap = {
      morning: "morning",
      afternoon: "afternoon",
      night: "night",
    }

    if (status === "working") {
      // Buscar trabalhadores ativos no turno
      const { data } = await supabase
        .from("schedule_days")
        .select(`
          shift,
          shift_assignments (
            worker:workers (id, name, employee_id, specialties),
            line:production_lines (name),
            specialty:specialties (name)
          )
        `)
        .eq("date", selectedDate.toISOString().split("T")[0])
        .eq("shift", shiftMap[selectedShift])

      const workers: WorkerDetail[] = []
      data?.[0]?.shift_assignments?.forEach((assignment: any) => {
        workers.push({
          id: assignment.worker.id,
          name: assignment.worker.name,
          employee_id: assignment.worker.employee_id,
          status: "working",
          shift: selectedShift,
          specialty: assignment.specialty?.name || "N/A",
          line: assignment.line?.name || "N/A",
        })
      })

      setWorkerDetails(workers)
    } else if (status === "absent") {
      // Buscar ausências
      const { data } = await supabase
        .from("absences")
        .select(`
          worker:workers (id, name, employee_id)
        `)
        .eq("created_at::date", selectedDate.toISOString().split("T")[0])

      const workers: WorkerDetail[] =
        data?.map((absence: any) => ({
          id: absence.worker.id,
          name: absence.worker.name,
          employee_id: absence.worker.employee_id,
          status: "absent",
        })) || []

      setWorkerDetails(workers)
    }
    // Implementar lógica similar para DC e vacation

    setLoading(false)
  }

  const loadLineDetails = async (lineId: string) => {
    setLoading(true)
    const supabase = getSupabase()

    // Buscar informações da linha
    const { data: line } = await supabase.from("production_lines").select("*").eq("id", lineId).single()

    // Buscar plano da linha para o dia
    const { data: shiftPlan } = await supabase
      .from("shift_plans")
      .select(`
        target_quantity,
        product:products (name, description),
        production_tracking (produced_quantity)
      `)
      .eq("line_id", lineId)
      .eq("daily_plan.date", selectedDate.toISOString().split("T")[0])
      .single()

    // Buscar trabalhadores na linha
    const { data: assignments } = await supabase
      .from("shift_assignments")
      .select(`
        worker:workers (name),
        specialty:specialties (name)
      `)
      .eq("line_id", lineId)
      .eq("schedule_day.date", selectedDate.toISOString().split("T")[0])

    const detail: LineDetail = {
      id: lineId,
      name: line?.name || "",
      description: line?.description || "",
      product: shiftPlan?.product?.name || "",
      productDescription: shiftPlan?.product?.description || "",
      workers:
        assignments?.map((a: any) => ({
          name: a.worker?.name || "",
          specialty: a.specialty?.name || "",
        })) || [],
      produced: Number(shiftPlan?.production_tracking?.[0]?.produced_quantity || 0),
      target: Number(shiftPlan?.target_quantity || 0),
    }

    setLineDetail(detail)
    setLoading(false)
  }

  const currentStats = workerStats[selectedShift]
  const total = currentStats.working + currentStats.absent + currentStats.dc + currentStats.vacation

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="container mx-auto px-2 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Visão geral das operações em tempo real</p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Factory className="h-4 w-4 sm:h-5 sm:w-5" />
                  Linhas de Produção
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {productionLines.filter((l) => l.isRunning).length}/{productionLines.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {productionLines.slice(0, 3).map((line) => (
                <div
                  key={line.id}
                  onClick={() => {
                    setSelectedLine(line.id)
                    loadLineDetails(line.id)
                  }}
                  className="space-y-2 p-3 sm:p-3 rounded-lg border bg-card hover:bg-accent active:bg-accent transition-colors cursor-pointer min-h-[60px] touch-manipulation"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${line.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{line.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{line.product}</p>
                      </div>
                    </div>
                    <Badge variant={line.isRunning ? "default" : "secondary"} className="text-xs flex-shrink-0">
                      {line.isRunning ? "Ativa" : "Parada"}
                    </Badge>
                  </div>
                  {line.isRunning && (
                    <div className="space-y-1">
                      <Progress value={line.progress} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground">
                        {line.produced}/{line.target} ({Math.round(line.progress)}%)
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Trabalhadores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <Tabs value={selectedShift} onValueChange={(v) => setSelectedShift(v as any)}>
                <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11 p-1">
                  <TabsTrigger value="morning" className="text-xs sm:text-sm px-2 sm:px-3">
                    Manhã
                  </TabsTrigger>
                  <TabsTrigger value="afternoon" className="text-xs sm:text-sm px-2 sm:px-3">
                    Tarde
                  </TabsTrigger>
                  <TabsTrigger value="night" className="text-xs sm:text-sm px-2 sm:px-3">
                    Noite
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={selectedShift} className="space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => {
                        setSelectedWorkerStatus("working")
                        loadWorkerDetails("working")
                      }}
                      className="p-3 rounded-lg border bg-green-50 dark:bg-green-950 cursor-pointer hover:shadow-md active:scale-95 transition-all touch-manipulation min-h-[70px]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-green-900 dark:text-green-100">A trabalhar</p>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      </div>
                      <p className="text-xl font-bold text-green-600 mt-1">{currentStats.working}</p>
                    </div>

                    <div
                      onClick={() => {
                        setSelectedWorkerStatus("absent")
                        loadWorkerDetails("absent")
                      }}
                      className="p-3 rounded-lg border bg-red-50 dark:bg-red-950 cursor-pointer hover:shadow-md active:scale-95 transition-all touch-manipulation min-h-[70px]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-red-900 dark:text-red-100">Faltas</p>
                        <AlertCircle className="h-3 w-3 text-red-600" />
                      </div>
                      <p className="text-xl font-bold text-red-600 mt-1">{currentStats.absent}</p>
                    </div>

                    <div
                      onClick={() => {
                        setSelectedWorkerStatus("dc")
                        loadWorkerDetails("dc")
                      }}
                      className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 cursor-pointer hover:shadow-md active:scale-95 transition-all touch-manipulation min-h-[70px]"
                    >
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">DC</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">{currentStats.dc}</p>
                    </div>

                    <div
                      onClick={() => {
                        setSelectedWorkerStatus("vacation")
                        loadWorkerDetails("vacation")
                      }}
                      className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-950 cursor-pointer hover:shadow-md active:scale-95 transition-all touch-manipulation min-h-[70px]"
                    >
                      <p className="text-xs font-medium text-purple-900 dark:text-purple-100">Férias</p>
                      <p className="text-xl font-bold text-purple-600 mt-1">{currentStats.vacation}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedWorkerStatus} onOpenChange={() => setSelectedWorkerStatus(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {selectedWorkerStatus === "working" && "Trabalhadores Ativos"}
                {selectedWorkerStatus === "absent" && "Faltas"}
                {selectedWorkerStatus === "dc" && "Descanso Compensatório"}
                {selectedWorkerStatus === "vacation" && "Férias"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Turno: {selectedShift === "morning" ? "Manhã" : selectedShift === "afternoon" ? "Tarde" : "Noite"}
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {workerDetails.map((worker) => (
                  <div key={worker.id} className="p-3 sm:p-4 rounded-lg border bg-card touch-manipulation">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{worker.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">ID: {worker.employee_id}</p>
                      </div>
                      <Badge className="flex-shrink-0 text-xs">{worker.status}</Badge>
                    </div>
                    {worker.specialty && (
                      <div className="mt-2 text-xs sm:text-sm space-y-1">
                        <p className="text-muted-foreground">
                          Especialidade: <span className="text-foreground font-medium">{worker.specialty}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Linha: <span className="text-foreground font-medium">{worker.line}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {workerDetails.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum trabalhador encontrado</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedLine} onOpenChange={() => setSelectedLine(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{lineDetail?.name}</DialogTitle>
              <DialogDescription>{lineDetail?.description}</DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              lineDetail && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Produto</h3>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="font-medium">{lineDetail.product}</p>
                      <p className="text-sm text-muted-foreground">{lineDetail.productDescription}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Progresso</h3>
                    <div className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Produzido / Objetivo</span>
                        <span className="font-medium">
                          {lineDetail.produced} / {lineDetail.target}
                        </span>
                      </div>
                      <Progress value={(lineDetail.produced / lineDetail.target) * 100} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Trabalhadores ({lineDetail.workers.length})</h3>
                    <div className="space-y-2">
                      {lineDetail.workers.map((worker, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <p className="font-medium">{worker.name}</p>
                          <p className="text-sm text-muted-foreground">Função: {worker.specialty}</p>
                        </div>
                      ))}
                      {lineDetail.workers.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">Nenhum trabalhador alocado</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
