"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Eye, Trash2, Download, Edit } from "lucide-react"
import type { Schedule } from "@/lib/types"

interface ScheduleListProps {
  schedules: Schedule[]
  workers: any[]
  productionLines: any[]
  products: any[]
  onView: (schedule: Schedule) => void
  onDelete: (scheduleId: string) => void
  onExport?: (schedule: Schedule) => void
  onEdit?: (schedule: Schedule) => void
  readOnly?: boolean
}

export function ScheduleList({
  schedules,
  workers,
  productionLines,
  products,
  onView,
  onDelete,
  onExport,
  onEdit,
  readOnly = false,
}: ScheduleListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `${days} dias`
  }

  const getTotalAssignments = (schedule: Schedule) => {
    return schedule.days.reduce((sum, day) => sum + day.assignments.length, 0)
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">Nenhuma escala guardada ainda.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardHeader>
            <CardTitle className="text-lg">{schedule.name}</CardTitle>
            <CardDescription>
              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{getDuration(schedule.startDate, schedule.endDate)}</Badge>
              <Badge variant="outline">{getTotalAssignments(schedule)} alocações</Badge>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onView(schedule)} className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              {!readOnly && onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(schedule)} title="Editar escala">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onExport && (
                <Button size="sm" variant="outline" onClick={() => onExport(schedule)} title="Exportar para Excel">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(schedule.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
