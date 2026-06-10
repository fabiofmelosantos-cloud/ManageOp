"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, AlertTriangle, TrendingUp } from "lucide-react"
import { HRSummaryCards } from "@/components/hr/hr-summary-cards"
import { VacationCalendar } from "@/components/hr/vacation-calendar"
import { AbsencesList } from "@/components/hr/absences-list"
import { CompensatoryDaysList } from "@/components/hr/compensatory-days-list"

export default function HRPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="container mx-auto py-3 sm:py-8 px-2 sm:px-4 space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 rounded-lg sm:rounded-2xl p-3 sm:p-8 border-2 border-primary/20">
          <h1 className="text-xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            Recursos Humanos
          </h1>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-3">
            Consulta de férias, DC, faltas e gestão de ausências
          </p>
        </div>
        {/* </CHANGE> */}

        <HRSummaryCards />
        {/* </CHANGE> */}

        <Tabs defaultValue="vacation" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:grid sm:grid-cols-3 h-auto gap-1 sm:gap-2">
              <TabsTrigger
                value="vacation"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Férias
              </TabsTrigger>
              <TabsTrigger
                value="compensatory"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Descanso Compensatório
              </TabsTrigger>
              <TabsTrigger
                value="absences"
                className="text-xs sm:text-sm lg:text-base py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Faltas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="vacation" className="mt-4 sm:mt-6">
            <VacationCalendar />
          </TabsContent>

          <TabsContent value="compensatory" className="mt-4 sm:mt-6">
            <CompensatoryDaysList />
          </TabsContent>

          <TabsContent value="absences" className="mt-4 sm:mt-6">
            <AbsencesList />
          </TabsContent>
        </Tabs>
        {/* </CHANGE> */}
      </div>
    </div>
  )
}
