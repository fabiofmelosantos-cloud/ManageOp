"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export function ProtectedWrapper({ children }: { children: React.ReactNode }) {
  const { userProfile, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isAuthPage = pathname.startsWith("/auth")

  useEffect(() => {
    if (!isLoading && !userProfile && !isAuthPage) {
      router.push("/auth/login")
    }
  }, [userProfile, isLoading, isAuthPage, router])

  // Páginas de autenticação sempre mostram
  if (isAuthPage) {
    return <>{children}</>
  }

  // Mostrar loading apenas se ainda estiver carregando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não tiver perfil e não for página de auth, não mostrar nada (vai redirecionar)
  if (!userProfile && !isAuthPage) {
    return null
  }

  // Mostrar conteúdo se tiver perfil
  return <>{children}</>
}
