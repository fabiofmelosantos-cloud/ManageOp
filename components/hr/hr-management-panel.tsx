"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, AlertTriangle, Plus, Trash2, CheckCircle } from "lucide-react"
import { format, differenceInDays, addDays } from "date-fns"
import { pt } from "date-fns/locale"
import { getSupabase } from "@/lib/supabase/client"
import type { Worker } from "@/lib/types"

interface Vacation {
  id: string
  worker_id: string
  start_date: string
  end_date: string
  days_count: number
  status: "pending" | "approved" | "rejected"
  notes?: string
}

interface CompensatoryDay {
  id: string
  worker_id: string
  date: string
  reason: string
  status: "pending" | "approved" | "used"
}

interface Absence {
  id: string
  worker_id: string
  date: string
  reason: string
  justified: boolean
  notes?: string
}

export function HRManagementPanel() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState<string>("")
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [compensatoryDays, setCompensatoryDays] = useState<CompensatoryDay[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(false)

  // Vacation form state
  const [vacationStartDate, setVacationStartDate] = useState<Date>()
  const [vacationEndDate, setVacationEndDate] = useState<Date>()
  const [vacationNotes, setVacationNotes] = useState("")

  // DC form state
  const [dcDate, setDcDate] = useState<Date>()
  const [dcReason, setDcReason] = useState("")

  // Absence form state
  const [absenceDate, setAbsenceDate] = useState<Date>()
  const [absenceReason, setAbsenceReason] = useState("")
  const [absenceJustified, setAbsenceJustified] = useState(false)
  const [absenceNotes, setAbsenceNotes] = useState("")

  useEffect(() => {
    loadWorkers()
  }, [])

  useEffect(() => {
    if (selectedWorker) {
      loadWorkerData(selectedWorker)
    }
  }, [selectedWorker])

  const loadWorkers = async () => {
    try {
      const { loadWorkers, getWorkers } = await import("@/lib/storage")
      await loadWorkers()
      setWorkers(getWorkers())
    } catch (error) {
      console.error("Error loading workers:", error)
    }
  }

  const loadWorkerData = async (workerId: string) => {
    setLoading(true)
    try {
      const supabase = getSupabase()

      const [vacationsRes, dcRes, absencesRes] = await Promise.all([
        supabase.from("vacations").select("*").eq("worker_id", workerId).order("start_date", { ascending: false }),
        supabase.from("compensatory_days").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
        supabase.from("absences").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
      ])

      setVacations(vacationsRes.data || [])
      setCompensatoryDays(dcRes.data || [])
      setAbsences(absencesRes.data || [])
    } catch (error) {
      console.error("Error loading worker data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateVacationDays = () => {
    if (!vacationStartDate || !vacationEndDate) return 0
    return differenceInDays(vacationEndDate, vacationStartDate) + 1
  }

  const getRemainingVacationDays = () => {
    const ANNUAL_VACATION_DAYS = 22
    const currentYear = new Date().getFullYear()
    const usedDays = vacations
      .filter((v) => v.status === "approved" && new Date(v.start_date).getFullYear() === currentYear)
      .reduce((sum, v) => sum + v.days_count, 0)
    return ANNUAL_VACATION_DAYS - usedDays
  }

  const getAvailableDC = () => {
    return compensatoryDays.filter((dc) => dc.status === "approved").length
  }

  const getAbsenceCount = (months = 3) => {
    const cutoffDate = addDays(new Date(), -months * 30)
    return absences.filter((a) => new Date(a.date) >= cutoffDate).length
  }

  const isRecurrentAbsences = () => {
    return getAbsenceCount(3) >= 3
  }

  const handleAddVacation = async () => {
    if (!selectedWorker || !vacationStartDate || !vacationEndDate) {
      alert("Por favor preencha todos os campos")
      return
    }

    const daysCount = calculateVacationDays()
    if (daysCount > getRemainingVacationDays()) {
      alert("Dias de férias insuficientes!")
      return
    }

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("vacations").insert({
        worker_id: selectedWorker,
        start_date: format(vacationStartDate, "yyyy-MM-dd"),
        end_date: format(vacationEndDate, "yyyy-MM-dd"),
        days_count: daysCount,
        status: "approved",
        notes: vacationNotes,
      })

      if (error) throw error

      alert("Férias marcadas com sucesso!")
      setVacationStartDate(undefined)
      setVacationEndDate(undefined)
      setVacationNotes("")
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error adding vacation:", error)
      alert("Erro ao marcar férias")
    }
  }

  const handleAddDC = async () => {
    if (!selectedWorker || !dcDate || !dcReason) {
      alert("Por favor preencha todos os campos")
      return
    }

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("compensatory_days").insert({
        worker_id: selectedWorker,
        date: format(dcDate, "yyyy-MM-dd"),
        reason: dcReason,
        status: "approved",
      })

      if (error) throw error

      alert("DC marcado com sucesso!")
      setDcDate(undefined)
      setDcReason("")
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error adding DC:", error)
      alert("Erro ao marcar DC")
    }
  }

  const handleAddAbsence = async () => {
    if (!selectedWorker || !absenceDate || !absenceReason) {
      alert("Por favor preencha todos os campos")
      return
    }

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("absences").insert({
        worker_id: selectedWorker,
        date: format(absenceDate, "yyyy-MM-dd"),
        reason: absenceReason,
        justified: absenceJustified,
        notes: absenceNotes,
      })

      if (error) throw error

      alert("Falta registada com sucesso!")
      setAbsenceDate(undefined)
      setAbsenceReason("")
      setAbsenceJustified(false)
      setAbsenceNotes("")
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error adding absence:", error)
      alert("Erro ao registar falta")
    }
  }

  const handleDeleteVacation = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar estas férias?")) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("vacations").delete().eq("id", id)
      if (error) throw error
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error deleting vacation:", error)
    }
  }

  const handleDeleteDC = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este DC?")) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("compensatory_days").delete().eq("id", id)
      if (error) throw error
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error deleting DC:", error)
    }
  }

  const handleDeleteAbsence = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar esta falta?")) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("absences").delete().eq("id", id)
      if (error) throw error
      loadWorkerData(selectedWorker)
    } catch (error) {
      console.error("Error deleting absence:", error)
    }
  }

  const selectedWorkerData = workers.find((w) => w.id === selectedWorker)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Worker Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Selecionar Trabalhador</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue placeholder="Escolha um trabalhador" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name} - {worker.employeeId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedWorker && selectedWorkerData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">Férias Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-primary">{getRemainingVacationDays()} dias</div>
                <p className="text-xs text-muted-foreground mt-1">de 22 dias anuais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">DC Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{getAvailableDC()} dias</div>
                <p className="text-xs text-muted-foreground mt-1">acumulados</p>
              </CardContent>
            </Card>

            <Card className={isRecurrentAbsences() ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  Faltas (3 meses)
                  {isRecurrentAbsences() && <AlertTriangle className="h-4 w-4 text-red-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl sm:text-3xl font-bold ${isRecurrentAbsences() ? "text-red-600" : ""}`}>
                  {getAbsenceCount(3)} faltas
                </div>
                {isRecurrentAbsences() && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ Trabalhador reincidente</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="vacations" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="vacations" className="text-xs sm:text-sm py-2 sm:py-2.5">
                Férias
              </TabsTrigger>
              <TabsTrigger value="dc" className="text-xs sm:text-sm py-2 sm:py-2.5">
                DC
              </TabsTrigger>
              <TabsTrigger value="absences" className="text-xs sm:text-sm py-2 sm:py-2.5">
                Faltas
              </TabsTrigger>
            </TabsList>

            {/* Vacations Tab */}
            <TabsContent value="vacations" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Marcar Férias</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Disponíveis: {getRemainingVacationDays()} dias
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Data Início</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left h-10 sm:h-11 text-xs sm:text-sm bg-transparent"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {vacationStartDate ? format(vacationStartDate, "PPP", { locale: pt }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={vacationStartDate} onSelect={setVacationStartDate} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Data Fim</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left h-10 sm:h-11 text-xs sm:text-sm bg-transparent"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {vacationEndDate ? format(vacationEndDate, "PPP", { locale: pt }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={vacationEndDate} onSelect={setVacationEndDate} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {vacationStartDate && vacationEndDate && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        Total: {calculateVacationDays()} dias
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Notas (opcional)</Label>
                    <Textarea
                      value={vacationNotes}
                      onChange={(e) => setVacationNotes(e.target.value)}
                      placeholder="Observações adicionais..."
                      className="text-xs sm:text-sm min-h-[60px]"
                    />
                  </div>

                  <Button onClick={handleAddVacation} className="w-full h-10 sm:h-11 text-xs sm:text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Marcar Férias
                  </Button>
                </CardContent>
              </Card>

              {/* Vacations List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Férias Marcadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {vacations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">Nenhuma férias marcada</p>
                  ) : (
                    <div className="space-y-2">
                      {vacations.map((vacation) => (
                        <div
                          key={vacation.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={vacation.status === "approved" ? "default" : "secondary"}>
                                {vacation.status === "approved" ? "Aprovado" : vacation.status}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium">
                                {format(new Date(vacation.start_date), "dd/MM/yyyy")} -{" "}
                                {format(new Date(vacation.end_date), "dd/MM/yyyy")}
                              </span>
                              <span className="text-xs text-muted-foreground">({vacation.days_count} dias)</span>
                            </div>
                            {vacation.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{vacation.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVacation(vacation.id)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* DC Tab */}
            <TabsContent value="dc" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Marcar DC</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Disponíveis: {getAvailableDC()} dias</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left h-10 sm:h-11 text-xs sm:text-sm bg-transparent"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dcDate ? format(dcDate, "PPP", { locale: pt }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dcDate} onSelect={setDcDate} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Motivo</Label>
                    <Input
                      value={dcReason}
                      onChange={(e) => setDcReason(e.target.value)}
                      placeholder="Ex: Trabalho ao fim de semana, Horas extra..."
                      className="h-10 sm:h-11 text-xs sm:text-sm"
                    />
                  </div>

                  <Button onClick={handleAddDC} className="w-full h-10 sm:h-11 text-xs sm:text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Marcar DC
                  </Button>
                </CardContent>
              </Card>

              {/* DC List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">DC Marcados</CardTitle>
                </CardHeader>
                <CardContent>
                  {compensatoryDays.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">Nenhum DC marcado</p>
                  ) : (
                    <div className="space-y-2">
                      {compensatoryDays.map((dc) => (
                        <div
                          key={dc.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={
                                  dc.status === "approved" ? "default" : dc.status === "used" ? "secondary" : "outline"
                                }
                              >
                                {dc.status === "approved" ? "Disponível" : dc.status === "used" ? "Usado" : "Pendente"}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium">
                                {format(new Date(dc.date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{dc.reason}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDC(dc.id)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Absences Tab */}
            <TabsContent value="absences" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Registar Falta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left h-10 sm:h-11 text-xs sm:text-sm bg-transparent"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {absenceDate ? format(absenceDate, "PPP", { locale: pt }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={absenceDate} onSelect={setAbsenceDate} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Motivo</Label>
                    <Input
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      placeholder="Ex: Doença, Assunto pessoal..."
                      className="h-10 sm:h-11 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="justified"
                      checked={absenceJustified}
                      onChange={(e) => setAbsenceJustified(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="justified" className="text-xs sm:text-sm cursor-pointer">
                      Falta justificada
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Notas (opcional)</Label>
                    <Textarea
                      value={absenceNotes}
                      onChange={(e) => setAbsenceNotes(e.target.value)}
                      placeholder="Observações adicionais..."
                      className="text-xs sm:text-sm min-h-[60px]"
                    />
                  </div>

                  <Button onClick={handleAddAbsence} className="w-full h-10 sm:h-11 text-xs sm:text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Registar Falta
                  </Button>
                </CardContent>
              </Card>

              {/* Absences List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Faltas Registadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {absences.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">Nenhuma falta registada</p>
                  ) : (
                    <div className="space-y-2">
                      {absences.map((absence) => (
                        <div
                          key={absence.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={absence.justified ? "default" : "destructive"}>
                                {absence.justified ? "Justificada" : "Não Justificada"}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium">
                                {format(new Date(absence.date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{absence.reason}</p>
                            {absence.notes && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{absence.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAbsence(absence.id)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
