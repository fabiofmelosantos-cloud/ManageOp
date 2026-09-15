import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QualityEnvelope } from "@/components/production/quality-envelope"

export default function BarritasProductionPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <QualityEnvelope room="barritas" />
        <header className="flex flex-wrap items-center justify-between gap-4 pl-14">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href="/">
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Produção · Linha dedicada</p>
              <h1 className="text-3xl font-bold tracking-tight">Barritas</h1>
              <p className="text-sm text-muted-foreground">Sala de produção de barritas</p>
            </div>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Controlo de qualidade da sala</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              O envelope no canto superior esquerdo pisca e emite um sinal sonoro a cada hora (exceto às 17:00 e às
              18:00) para lembrar o operador de responder às perguntas de controlo de qualidade da sala Barritas.
            </p>
            <p>
              As perguntas são definidas pela Qualidade em Configurações › Qualidade e as respostas ficam registadas
              por lote e por dia, visíveis em Gestão › Qualidade.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
