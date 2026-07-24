"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface UserProfile {
  name: string
  employeeId: string
  role: string
  email: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Agora carrega usuário apenas uma vez no mount
  useEffect(() => {
    const loadUser = () => {
      try {
        if (typeof window === "undefined" || !window.localStorage) {
          setIsLoading(false)
          return
        }

        const storedUser = localStorage.getItem("user")

        if (storedUser) {
          const profile = JSON.parse(storedUser)
          setUserProfile(profile)
          setUser({ email: profile.email } as User)
        }
      } catch (error) {
        console.error("[v0] Erro ao carregar usuário:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, []) // Array de dependências vazio - executa apenas uma vez

  const signOut = async () => {
    localStorage.removeItem("user")
    setUser(null)
    setUserProfile(null)
    router.push("/auth/login")
    router.refresh()
  }

  return <AuthContext.Provider value={{ user, userProfile, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return context
}
