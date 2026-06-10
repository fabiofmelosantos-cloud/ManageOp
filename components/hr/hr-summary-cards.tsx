"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, TrendingUp, AlertTriangle, Users } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

export function HRSummaryCards() {
  const [stats, setStats] = useState({
    totalVacationDays: 0,
    totalCompensatoryDays: 0,
    totalAbsences: 0,
    totalWorkers: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createBrowserClient()

    const [workersRes, vacationRes, compensatoryRes, absencesRes] = await Promise.all([
      supabase.from("workers").select("id", { count: "exact" }),
      supabase.from("vacation_requests").select("total_days").eq("status", "approved"),
      supabase.from("compensatory_days").select("id", { count: "exact" }).eq("status", "approved"),
      supabase.from("absences").select("id", { count: "exact" }),
    ])

    const totalVacation = vacationRes.data?.reduce((sum, v) => sum + (v.total_days || 0), 0) || 0

    setStats({
      totalVacationDays: totalVacation,
      totalCompensatoryDays: compensatoryRes.count || 0,
      totalAbsences: absencesRes.count || 0,
      totalWorkers: workersRes.count || 0,
    })
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <Card className="bg-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Trabalhadores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalWorkers}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            Férias (dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalVacationDays}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            DC (dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalCompensatoryDays}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Faltas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalAbsences}</div>
        </CardContent>
      </Card>
    </div>
  )
}
