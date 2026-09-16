import Link from "next/link"
import { Factory, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const managementCards = [
  {
    title: "Qualidade",
    description: "Controlo de qualidade da produção: verificações hora a hora, bloqueios de arranque e registos.",
    href: "/management/quality",
    icon: ShieldCheck,
  },
  {
    title: "Produção",
    description: "Backup do histórico de produções fechadas, separado por dia de produção.",
    href: "/management/production",
    icon: Factory,
  },
]

export default function ManagementPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Gestão</h1>
        <p className="text-sm text-muted-foreground">Área de gestão das operações. Escolha um módulo para continuar.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {managementCards.map((card) => (
          <Link key={card.title} href={card.href} className="group">
            <Card className="h-full transition-colors hover:border-primary hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <card.icon className="size-5" />
                  </span>
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
