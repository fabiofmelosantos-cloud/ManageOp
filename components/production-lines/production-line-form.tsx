"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import type { ProductionLine, Product, Specialty, ProductionLineRequirement } from "@/lib/types"

interface ProductionLineFormProps {
  line?: ProductionLine
  products: Product[]
  specialties: Specialty[]
  onSubmit: (data: Omit<ProductionLine, "id" | "createdAt">) => void
  onCancel: () => void
}

export function ProductionLineForm({ line, products, specialties, onSubmit, onCancel }: ProductionLineFormProps) {
  const [name, setName] = useState(line?.name || "")
  const [description, setDescription] = useState(line?.description || "")
  const [isActive, setIsActive] = useState(line?.isActive ?? true)
  const [rpm, setRpm] = useState(line?.rpm || 0)
  const [lineLoad, setLineLoad] = useState(line?.lineLoad || 0)
  const [timeToLaminator, setTimeToLaminator] = useState(line?.timeToLaminator || 0)
  const [timeToPackaging, setTimeToPackaging] = useState(line?.timeToPackaging || 0)
  const [requirements, setRequirements] = useState<ProductionLineRequirement[]>(line?.requirements || [])
  const [expandedCards, setExpandedCards] = useState<number[]>([])
  const [draggedItem, setDraggedItem] = useState<{
    requirementIndex: number
    specialtyId: string
    positionIndex: number
  } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      description,
      isActive,
      rpm,
      lineLoad,
      timeToLaminator,
      timeToPackaging,
      requirements,
    })
  }

  const addRequirement = (productId: string) => {
    if (requirements.some((requirement) => requirement.productId === productId)) {
      return
    }

    const newIndex = requirements.length
    setRequirements((prev) => [
      ...prev,
      {
        productId,
        workersNeeded: 1,
        requiredSpecialties: [],
      },
    ])
    setExpandedCards((prev) => [...prev, newIndex])
  }

  const availableProducts = products.filter(
    (product) => !requirements.some((requirement) => requirement.productId === product.id),
  )

  const removeRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index))
    setExpandedCards((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)))
  }

  const updateRequirement = (index: number, updates: Partial<ProductionLineRequirement>) => {
    setRequirements((prev) => prev.map((req, i) => (i === index ? { ...req, ...updates } : req)))
  }

  const addSpecialtyToRequirement = (requirementIndex: number, specialtyId: string) => {
    const requirement = requirements[requirementIndex]
    const alreadyExists = requirement.requiredSpecialties.some((s) => s.specialtyId === specialtyId)

    if (!alreadyExists) {
      updateRequirement(requirementIndex, {
        requiredSpecialties: [...requirement.requiredSpecialties, { specialtyId, quantity: 1 }],
      })
    }
  }

  const removeSpecialtyFromRequirement = (requirementIndex: number, specialtyId: string) => {
    const requirement = requirements[requirementIndex]
    updateRequirement(requirementIndex, {
      requiredSpecialties: requirement.requiredSpecialties.filter((s) => s.specialtyId !== specialtyId),
    })
  }

  const updateSpecialtyQuantity = (requirementIndex: number, specialtyId: string, quantity: number) => {
    const requirement = requirements[requirementIndex]
    const specialty = requirement.requiredSpecialties.find((s) => s.specialtyId === specialtyId)

    const currentPositions = specialty?.positions || []
    const newPositions = Array.from({ length: quantity }, (_, i) => {
      return (
        currentPositions[i] || {
          order: i + 1,
          name: `${getSpecialtyName(specialtyId)} ${i + 1}`,
        }
      )
    })

    updateRequirement(requirementIndex, {
      requiredSpecialties: requirement.requiredSpecialties.map((s) =>
        s.specialtyId === specialtyId ? { ...s, quantity, positions: newPositions } : s,
      ),
    })
  }

  const updatePositionName = (requirementIndex: number, specialtyId: string, positionIndex: number, name: string) => {
    const requirement = requirements[requirementIndex]
    updateRequirement(requirementIndex, {
      requiredSpecialties: requirement.requiredSpecialties.map((s) => {
        if (s.specialtyId === specialtyId) {
          const positions = s.positions || []
          const newPositions = [...positions]
          newPositions[positionIndex] = { ...newPositions[positionIndex], name }
          return { ...s, positions: newPositions }
        }
        return s
      }),
    })
  }

  const movePosition = (requirementIndex: number, specialtyId: string, fromIndex: number, toIndex: number) => {
    const requirement = requirements[requirementIndex]
    updateRequirement(requirementIndex, {
      requiredSpecialties: requirement.requiredSpecialties.map((s) => {
        if (s.specialtyId === specialtyId) {
          const positions = [...(s.positions || [])]
          const [moved] = positions.splice(fromIndex, 1)
          positions.splice(toIndex, 0, moved)
          positions.forEach((p, i) => {
            p.order = i + 1
          })
          return { ...s, positions }
        }
        return s
      }),
    })
  }

  const handleDragStart = (
    e: React.DragEvent,
    requirementIndex: number,
    specialtyId: string,
    positionIndex: number,
  ) => {
    setDraggedItem({ requirementIndex, specialtyId, positionIndex })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, requirementIndex: number, specialtyId: string, targetIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    if (
      draggedItem.requirementIndex === requirementIndex &&
      draggedItem.specialtyId === specialtyId &&
      draggedItem.positionIndex !== targetIndex
    ) {
      movePosition(requirementIndex, specialtyId, draggedItem.positionIndex, targetIndex)
    }

    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || "Produto Desconhecido"
  }

  const getSpecialtyName = (specialtyId: string) => {
    return specialties.find((s) => s.id === specialtyId)?.name || "Desconhecida"
  }

  const getAvailableSpecialties = (requirementIndex: number) => {
    const requirement = requirements[requirementIndex]
    const selectedIds = requirement.requiredSpecialties.map((s) => s.specialtyId)
    return specialties.filter((s) => !selectedIds.includes(s.id))
  }

  const toggleCardExpansion = (index: number) => {
    setExpandedCards((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="line-name">Nome da Linha *</Label>
          <Input id="line-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Linha 1" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="line-description">Descrição</Label>
          <Input
            id="line-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da linha de produção"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="line-rpm">RPM da Linha</Label>
            <Input
              id="line-rpm"
              type="number"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              placeholder="Ex: 120"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Rotações por minuto da linha de produção</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-load">Carregamento da Linha (kg)</Label>
            <Input
              id="line-load"
              type="number"
              value={lineLoad}
              onChange={(e) => setLineLoad(Number(e.target.value))}
              placeholder="Ex: 500"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Quantidade entre laminador/rotativa e embalagem</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time-to-laminator">Tempo até Laminador/Rotativa (minutos)</Label>
            <Input
              id="time-to-laminator"
              type="number"
              value={timeToLaminator}
              onChange={(e) => setTimeToLaminator(Number(e.target.value))}
              placeholder="Ex: 30"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Tempo entre paragem da linha e do laminador</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-to-packaging">Tempo até Embalagem (minutos)</Label>
            <Input
              id="time-to-packaging"
              type="number"
              value={timeToPackaging}
              onChange={(e) => setTimeToPackaging(Number(e.target.value))}
              placeholder="Ex: 45"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Tempo entre laminador e embalagem</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="line-active" checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} />
          <Label htmlFor="line-active" className="cursor-pointer font-normal">
            Linha Ativa
          </Label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="line-products">Produtos produzidos por esta linha *</Label>
          <Select
            value=""
            onValueChange={addRequirement}
            disabled={availableProducts.length === 0}
          >
            <SelectTrigger id="line-products">
              <SelectValue
                placeholder={
                  products.length === 0
                    ? "Adicione produtos primeiro"
                    : availableProducts.length === 0
                      ? "Todos os produtos já foram adicionados"
                      : "Selecione um produto para adicionar"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Escolha no menu os produtos que esta linha pode produzir. Você pode adicionar mais de um.
          </p>
        </div>

        {requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            Nenhum produto selecionado para esta linha
          </p>
        ) : (
          <div className="space-y-4">
            {requirements.map((requirement, index) => {
              const isExpanded = expandedCards.includes(index)
              const totalWorkers = requirement.workersNeeded
              const availableSpecialties = getAvailableSpecialties(index)

              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">{getProductName(requirement.productId)}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {totalWorkers} {totalWorkers === 1 ? "operador" : "operadores"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => toggleCardExpansion(index)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeRequirement(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Produto</Label>
                          <Select
                            value={requirement.productId}
                            onValueChange={(value) => updateRequirement(index, { productId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Total de Operadores</Label>
                          <Input
                            type="number"
                            min="1"
                            value={requirement.workersNeeded}
                            onChange={(e) =>
                              updateRequirement(index, {
                                workersNeeded: Number.parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Postos e Especialidades Necessárias</Label>
                          {availableSpecialties.length > 0 && (
                            <Select
                              onValueChange={(value) => {
                                addSpecialtyToRequirement(index, value)
                              }}
                            >
                              <SelectTrigger className="w-[200px] h-8">
                                <SelectValue placeholder="Adicionar Especialidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSpecialties.map((specialty) => (
                                  <SelectItem key={specialty.id} value={specialty.id}>
                                    <div className="flex items-center gap-2">
                                      <Plus className="h-3 w-3" />
                                      {specialty.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {specialties.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma especialidade cadastrada</p>
                        ) : requirement.requiredSpecialties.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                            Nenhuma especialidade selecionada
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {requirement.requiredSpecialties.map((specialtyReq) => {
                              const specialty = specialties.find((s) => s.id === specialtyReq.specialtyId)
                              if (!specialty) return null

                              return (
                                <div key={specialtyReq.specialtyId} className="space-y-2 p-3 rounded-lg border bg-card">
                                  <div className="flex items-center gap-3">
                                    <Label className="cursor-pointer font-semibold flex-1">{specialty.name}</Label>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                        Quantidade:
                                      </Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={specialtyReq.quantity}
                                        onChange={(e) =>
                                          updateSpecialtyQuantity(
                                            index,
                                            specialtyReq.specialtyId,
                                            Number.parseInt(e.target.value) || 1,
                                          )
                                        }
                                        className="w-20 h-8"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeSpecialtyFromRequirement(index, specialtyReq.specialtyId)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>

                                  {specialtyReq.positions && specialtyReq.positions.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                                        <GripVertical className="h-3 w-3" />
                                        Postos de Trabalho (arraste para reordenar):
                                      </Label>
                                      {specialtyReq.positions.map((position, posIdx) => (
                                        <div
                                          key={posIdx}
                                          draggable
                                          onDragStart={(e) =>
                                            handleDragStart(e, index, specialtyReq.specialtyId, posIdx)
                                          }
                                          onDragOver={handleDragOver}
                                          onDrop={(e) => handleDrop(e, index, specialtyReq.specialtyId, posIdx)}
                                          onDragEnd={handleDragEnd}
                                          className={`flex items-center gap-2 bg-background p-2 rounded border cursor-move hover:border-blue-500 transition-colors ${
                                            draggedItem?.requirementIndex === index &&
                                            draggedItem?.specialtyId === specialtyReq.specialtyId &&
                                            draggedItem?.positionIndex === posIdx
                                              ? "opacity-50 border-blue-500"
                                              : ""
                                          }`}
                                        >
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          <Badge variant="outline" className="w-8 justify-center font-bold">
                                            {position.order}
                                          </Badge>
                                          <Input
                                            type="text"
                                            value={position.name}
                                            onChange={(e) =>
                                              updatePositionName(
                                                index,
                                                specialtyReq.specialtyId,
                                                posIdx,
                                                e.target.value,
                                              )
                                            }
                                            placeholder={`Ex: Amassador, Embalador Principal...`}
                                            className="h-8 flex-1"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{line ? "Atualizar" : "Criar"} Linha</Button>
      </div>
    </form>
  )
}
