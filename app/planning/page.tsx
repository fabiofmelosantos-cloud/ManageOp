import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlanningPage() {
  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar ao dashboard">
            <Link href="/"><ArrowLeft data-icon="inline-start" /></Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Gestão de produção</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Planeamento</h1>
          </div>
        </div>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays aria-hidden="true" /></div>
              <div><CardTitle>Planeamento de produção</CardTitle><CardDescription>Organize os planos e necessidades de produção da fábrica.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">A área de planeamento está pronta para receber os planos de produção.</p></CardContent>
        </Card>
      </div>
    </main>
  )
}

export const metadata = { title: "Planeamento | ManageOp", description: "Planeamento de produção na ManageOp." }
