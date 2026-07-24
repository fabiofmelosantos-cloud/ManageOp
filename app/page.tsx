"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Factory, Users, TrendingUp, AlertCircle } from "lucide-react"
import { useDateContext } from "@/components/layout/app-header"
import { loadProductionLines, loadProductionTracking, loadWorkers } from "@/lib/storage"

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
    try {
      const [lines, tracking] = await Promise.all([loadProductionLines(), loadProductionTracking()])
      const dateStr = selectedDate.toISOString().split("T")[0]

      const mapped = lines.map((line: any) => {
        const t = tracking.find((tr: any) => tr.lineId === line.id && tr.date === dateStr)
        const produced = Number(t?.producedQuantity || 0)
        const target = Number(t?.target || line.target || 0)
        return {
          id: line.id,
          name: line.name || "Linha",
          product: line.product || "",
          productDescription: line.description || "",
          isRunning: t?.isRunning ?? false,
          produced,
          target,
          progress: target > 0 ? (produced / target) * 100 : 0,
        }
      })

      setProductionLines(mapped)
      await loadWorkerStats()
    } catch (error) {
      console.error("[v0] Erro ao carregar dados de produção:", error)
    }
  }

  const loadWorkerStats = async () => {
    try {
      const workers = await loadWorkers()
      // Sem dados relacionais por turno no armazenamento atual, mostramos o total
      // de trabalhadores no turno da manhã como referência inicial.
      setWorkerStats({
        morning: { working: workers.length, absent: 0, dc: 0, vacation: 0 },
        afternoon: { working: 0, absent: 0, dc: 0, vacation: 0 },
        night: { working: 0, absent: 0, dc: 0, vacation: 0 },
      })
    } catch (error) {
      console.error("[v0] Erro ao carregar estatísticas de trabalhadores:", error)
    }
  }

  const loadWorkerDetails = async (status: string) => {
    setLoading(true)
    try {
      if (status === "working") {
        const workers = await loadWorkers()
        setWorkerDetails(
          workers.map((w: any) => ({
            id: w.id,
            name: w.name,
            employee_id: w.employeeId || w.employee_id || "",
            status: "working",
            shift: selectedShift,
            specialty: Array.isArray(w.specialties) ? w.specialties.join(", ") : w.specialty || "",
          })),
        )
      } else {
        setWorkerDetails([])
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar detalhes de trabalhadores:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadLineDetails = async (lineId: string) => {
    setLoading(true)
    try {
      const [lines, tracking] = await Promise.all([loadProductionLines(), loadProductionTracking()])
      const line = lines.find((l: any) => l.id === lineId)
      const dateStr = selectedDate.toISOString().split("T")[0]
      const t = tracking.find((tr: any) => tr.lineId === lineId && tr.date === dateStr)

      setLineDetail({
        id: lineId,
        name: line?.name || "",
        description: (line as any)?.description || "",
        product: (line as any)?.product || "",
        productDescription: "",
        workers: [],
        produced: Number(t?.producedQuantity || 0),
        target: Number((t as any)?.target || (line as any)?.target || 0),
      })
    } catch (error) {
      console.error("[v0] Erro ao carregar detalhes da linha:", error)
    } finally {
      setLoading(false)
    }
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
