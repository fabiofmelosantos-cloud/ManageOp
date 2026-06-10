"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

export default function CreateAdminPage() {
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState("")

  const handleCreateAdmin = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/create-admin", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar admin")
      }

      setCreated(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Admin Criado com Sucesso!</h1>
            <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2 border">
              <p className="text-sm font-semibold text-primary">Credenciais de Acesso:</p>
              <p className="text-sm">
                <strong>Email:</strong> admin@manageop.com
              </p>
              <p className="text-sm">
                <strong>Password:</strong> admin123
              </p>
            </div>
            <Button onClick={() => (window.location.href = "/auth/login")} className="w-full" size="lg">
              Ir para Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Criar Utilizador Admin</h1>
            <p className="text-sm text-muted-foreground">Crie o utilizador administrador inicial do sistema</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg space-y-2 border">
            <p className="text-sm font-semibold text-primary">Credenciais que serão criadas:</p>
            <p className="text-sm">
              <strong>Email:</strong> admin@manageop.com
            </p>
            <p className="text-sm">
              <strong>Password:</strong> admin123
            </p>
          </div>

          <Button onClick={handleCreateAdmin} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A criar...
              </>
            ) : (
              "Criar Utilizador Admin"
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
