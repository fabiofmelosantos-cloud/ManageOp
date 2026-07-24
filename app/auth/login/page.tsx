"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Factory } from "lucide-react"

const ACCESS_PASSWORD = "XPTO48RX3"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const cleanPassword = password.trim()

    if (cleanPassword === ACCESS_PASSWORD) {
      try {
        const userProfile = {
          name: "Administrador",
          employeeId: "admin",
          role: "admin",
          email: "admin",
        }

        localStorage.setItem("user", JSON.stringify(userProfile))

        const saved = localStorage.getItem("user")

        if (!saved) {
          setError("Erro ao salvar sessão. Verifique as permissões do navegador.")
          setIsLoading(false)
          return
        }

        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 100)
      } catch (error) {
        console.error("Erro ao fazer login:", error)
        setError("Erro ao iniciar sessão. Tente novamente.")
        setIsLoading(false)
      }
    } else {
      setError("Credenciais inválidas")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ManageOp</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão de Produção</p>
          </div>

          <Card className="border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
              <CardDescription>Insira suas credenciais para acessar o sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha de Acesso</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos Termos e Política de Privacidade
          </p>
        </div>
      </div>
    </div>
  )
}
