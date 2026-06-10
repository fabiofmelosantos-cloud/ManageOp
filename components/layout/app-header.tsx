"use client"

import type React from "react"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Factory, CalendarIcon } from "lucide-react"
import { NavigationSidebar } from "./navigation-sidebar"
import { Calendar } from "@/components/ui/calendar"
import { pt } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

import { createContext, useContext } from "react"

interface DateContextType {
  selectedDate: Date | undefined
  setSelectedDate: (date: Date | undefined) => void
}

const DateContext = createContext<DateContextType | undefined>(undefined)

export function useDateContext() {
  const context = useContext(DateContext)
  if (!context) {
    return { selectedDate: new Date(), setSelectedDate: () => {} }
  }
  return context
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  return <DateContext.Provider value={{ selectedDate, setSelectedDate }}>{children}</DateContext.Provider>
}

export function AppHeader() {
  const { selectedDate, setSelectedDate } = useDateContext()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <header className="border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 z-50 shadow-sm">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <NavigationSidebar />

          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg ring-2 ring-primary/20">
              <Factory className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg sm:text-xl text-foreground">ManageOp</span>
          </Link>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="default" className="h-9 sm:h-10 px-3 gap-2 bg-transparent">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {selectedDate ? format(selectedDate, "dd MMM", { locale: pt }) : "Selecionar"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" side="bottom" sideOffset={8}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  setIsCalendarOpen(false)
                }}
                locale={pt}
                weekStartsOn={0}
                showOutsideDays={true}
                fixedWeeks
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </nav>
      </div>
    </header>
  )
}
