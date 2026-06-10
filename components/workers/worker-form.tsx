"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Worker, Specialty, ShiftType, SchedulePattern } from "@/lib/types"

interface WorkerFormProps {
  worker?: Worker
  specialties: Specialty[]
  onSubmit: (data: Omit<Worker, "id" | "createdAt">) => void
  onCancel: () => void
}

export function WorkerForm({ worker, specialties, onSubmit, onCancel }: WorkerFormProps) {
  const [name, setName] = useState(worker?.name || "")
  const [employeeId, setEmployeeId] = useState(worker?.employeeId || "")
  const [email, setEmail] = useState(worker?.email || "")
  const [phone, setPhone] = useState(worker?.phone || "")
  const [company, setCompany] = useState(worker?.company || "")
  const [companyColor, setCompanyColor] = useState(worker?.companyColor || "#3b82f6")
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(worker?.specialties || [])
  const [availableShifts, setAvailableShifts] = useState<ShiftType[]>(worker?.availableShifts || [])
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>(worker?.schedulePattern || "5x2")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      employeeId,
      email,
      phone,
      company: company.trim() || undefined,
      companyColor: company.trim() ? companyColor : undefined,
      specialties: selectedSpecialties,
      availableShifts,
      schedulePattern,
    })
  }

  const toggleSpecialty = (specialtyId: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialtyId) ? prev.filter((id) => id !== specialtyId) : [...prev, specialtyId],
    )
  }

  const toggleShift = (shift: ShiftType) => {
    setAvailableShifts((prev) => (prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]))
  }

  const shiftLabels: Record<ShiftType, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    night: "Noite",
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeId">Número de Funcionário *</Label>
          <Input
            id="employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="12345"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Nome da empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyColor">Cor da Empresa</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="companyColor"
              type="color"
              value={companyColor}
              onChange={(e) => setCompanyColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
              disabled={!company.trim()}
            />
            <span className="text-sm text-muted-foreground">
              {company.trim() ? "Selecione a cor" : "Adicione uma empresa primeiro"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Padrão de Escala *</Label>
        <Select value={schedulePattern} onValueChange={(v: SchedulePattern) => setSchedulePattern(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5x2">5 dias de trabalho, 2 de folga (rotativo)</SelectItem>
            <SelectItem value="4x2">4 dias de trabalho, 2 de folga (rotativo)</SelectItem>
            <SelectItem value="5x2-fixed">Segunda a Sexta (fins de semana fixos)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Turnos Disponíveis *</Label>
        <div className="flex flex-col gap-2">
          {(Object.entries(shiftLabels) as [ShiftType, string][]).map(([shift, label]) => (
            <div key={shift} className="flex items-center gap-2">
              <Checkbox
                id={`shift-${shift}`}
                checked={availableShifts.includes(shift)}
                onCheckedChange={() => toggleShift(shift)}
              />
              <Label htmlFor={`shift-${shift}`} className="cursor-pointer font-normal">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Especialidades *</Label>
        {specialties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma especialidade cadastrada. Adicione especialidades primeiro.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {specialties.map((specialty) => (
              <div key={specialty.id} className="flex items-center gap-2">
                <Checkbox
                  id={`specialty-${specialty.id}`}
                  checked={selectedSpecialties.includes(specialty.id)}
                  onCheckedChange={() => toggleSpecialty(specialty.id)}
                />
                <Label htmlFor={`specialty-${specialty.id}`} className="cursor-pointer font-normal">
                  {specialty.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{worker ? "Atualizar" : "Adicionar"} Trabalhador</Button>
      </div>
    </form>
  )
}
