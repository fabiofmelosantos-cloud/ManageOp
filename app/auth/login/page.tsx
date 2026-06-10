"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Factory } from "lucide-react"

const ADMIN_EMPLOYEE_ID = "11111"

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Verificar primeiro se é o admin
    if (employeeId === ADMIN_EMPLOYEE_ID) {
      try {
        const userProfile = {
          name: "Administrador",
          employeeId: "11111",
          role: "admin",
          email: "admin@sistema.local",
        }

        localStorage.setItem("user", JSON.stringify(userProfile))
        
        // Disparar evento para notificar o AuthContext
        window.dispatchEvent(new Event("userChanged"))

        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 100)
        return
      } catch (err) {
        console.error("Erro ao fazer login:", err)
        setError("Erro ao iniciar sessão. Tente novamente.")
        setIsLoading(false)
        return
      }
    }

    // Tentar login com utilizador registado
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          employeeId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Número de colaborador inválido")
      }

      const userProfile = {
        name: data.user.name,
        employeeId: data.user.employeeId,
        role: data.user.role,
        email: data.user.email || `${data.user.employeeId}@sistema.local`,
      }

      localStorage.setItem("user", JSON.stringify(userProfile))
      
      // Disparar evento para notificar o AuthContext
      window.dispatchEvent(new Event("userChanged"))

      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Erro ao fazer login:", err)
      setError(err instanceof Error ? err.message : "Número de colaborador inválido")
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
              <CardDescription>Insira o seu número de colaborador para aceder ao sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Número de Colaborador</Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Ex: 12345"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    O número de colaborador serve como credencial de acesso
                  </p>
                </div>
                {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "A entrar..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Criar conta
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, concorda com os nossos Termos e Política de Privacidade
          </p>
        </div>
      </div>
    </div>
  )
}
