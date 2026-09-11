"use client"

import Link from "next/link"
import { PackageCheck } from "lucide-react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

export function FinishedProductsCard() {
  return <Link href="/finished-products" className="block"><Card className="group aspect-square border-primary/20 transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"><CardContent className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center sm:p-3"><PackageCheck className="size-8 text-primary" aria-hidden="true" /><CardTitle className="text-xs sm:text-sm">Saída de produto acabado</CardTitle></CardContent></Card></Link>
}
