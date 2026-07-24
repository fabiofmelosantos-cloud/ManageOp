"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, ClipboardList, Activity, Settings, Menu, Eye, User, LogOut, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Escalas", href: "/schedules", icon: Eye },
  { name: "Coordenador", href: "/coordinator", icon: Activity },
  { name: "Plano Semanal", href: "/production-plan", icon: ClipboardList },
  { name: "RH", href: "/hr", icon: User },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function NavigationSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { userProfile, signOut } = useAuth()
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    localStorage.setItem("theme", newTheme)
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {userProfile && (
        <div className="p-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userProfile.name}</p>
              <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
              {userProfile.employeeId && (
                <p className="text-xs text-muted-foreground mt-0.5">Nº {userProfile.employeeId}</p>
              )}
              <p className="text-xs text-primary font-medium mt-1 capitalize">
                {userProfile.role === "admin"
                  ? "Administrador"
                  : userProfile.role === "coordinator"
                    ? "Coordenador"
                    : userProfile.role === "manager"
                      ? "Gestor"
                      : "RH"}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/20 text-primary border border-primary"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {mounted && (
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="w-full justify-start gap-3 bg-transparent"
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => {
            signOut()
            setOpen(false)
          }}
          className="w-full justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Terminar Sessão</span>
        </Button>
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <NavContent />
      </SheetContent>
    </Sheet>
  )
}
