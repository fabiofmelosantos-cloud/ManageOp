"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, HelpCircle, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageGuides } from "@/lib/page-guides"

export function PageGuide() {
  const pathname = usePathname()
  const guide = pathname ? pageGuides[pathname] : undefined

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const storageKey = `page-guide-hidden:${pathname}`

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(localStorage.getItem(storageKey) === "1")
    } catch {
      setDismissed(false)
    }
    setOpen(true)
  }, [storageKey])

  if (!guide || !mounted) return null

  const hide = () => {
    setDismissed(true)
    try {
      localStorage.setItem(storageKey, "1")
    } catch {
      // ignore
    }
  }

  const show = () => {
    setDismissed(false)
    setOpen(true)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }

  if (dismissed) {
    return (
      <div className="container mx-auto px-2 pt-3 sm:px-6 sm:pt-4">
        <button
          type="button"
          onClick={show}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <HelpCircle className="size-3.5" />
          Como usar esta página
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-2 pt-3 sm:px-6 sm:pt-4">
      <section
        aria-label="Guia da página"
        className="rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex flex-1 items-center gap-2 text-left"
            aria-expanded={open}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <HelpCircle className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground sm:text-base">{guide.title}</span>
            {open ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={hide}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Ocultar guia nesta página"
          >
            <X className="size-3.5" />
            Ocultar
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.intro}</p>

            <ol className="space-y-2">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-pretty">{step}</span>
                </li>
              ))}
            </ol>

            {guide.connections.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ligado a
                </p>
                <div className="flex flex-wrap gap-2">
                  {guide.connections.map((connection) => (
                    <Link
                      key={connection.href}
                      href={connection.href}
                      title={connection.note}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5",
                        "text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10",
                      )}
                    >
                      {connection.label}
                      <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
