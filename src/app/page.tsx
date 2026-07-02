"use client"

import * as React from "react"
import useSWR from "swr"
import { Search, GripVertical, Edit, Trash2, Plus, Minus, AlertCircle } from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { toast } from "sonner"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { getStoreProducts, getLatestUploadInfo } from "@/actions/data-actions"
import { removeStoreProduct, reorderStoreProducts, updateStoreProduct } from "@/actions/store-actions"
import { StoreProduct } from "@/types"

export default function StorePage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [priceFilter, setPriceFilter] = React.useState<"all" | "up" | "down" | "same">("all")
  const [editingProduct, setEditingProduct] = React.useState<StoreProduct | null>(null)
  
  const { data: rawStoreProducts, mutate, isLoading } = useSWR('store', getStoreProducts)
  const { data: latestInfo } = useSWR('latestInfo', getLatestUploadInfo)

  const [localProducts, setLocalProducts] = React.useState<StoreProduct[]>([])

  React.useEffect(() => {
    if (rawStoreProducts) {
      setLocalProducts(rawStoreProducts)
    }
  }, [rawStoreProducts])

  const filteredProducts = React.useMemo(() => {
    if (!localProducts) return []
    return localProducts.filter(p => {
      const lowerQuery = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || p.custom_name.toLowerCase().includes(lowerQuery)
      
      if (!matchesSearch) return false

      if (priceFilter !== "all") {
        const basePrice = p.manual_price ?? p.catalog_product?.price ?? 0
        const previousPrice = p.catalog_product?.previous_price
        
        const isUp = previousPrice && basePrice > previousPrice
        const isDown = previousPrice && basePrice < previousPrice
        const isSame = !isUp && !isDown

        if (priceFilter === "up" && !isUp) return false
        if (priceFilter === "down" && !isDown) return false
        if (priceFilter === "same" && !isSame) return false
      }

      return true
    })
  }, [localProducts, searchQuery, priceFilter])

  const isDragDisabled = !!searchQuery || priceFilter !== "all"

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || isDragDisabled) return

    const items = Array.from(localProducts)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedItems = items.map((item, index) => ({ ...item, order_position: index }))
    setLocalProducts(updatedItems)

    const updates = updatedItems.map(item => ({ id: item.id, order_position: item.order_position }))
    await reorderStoreProducts(updates)
    mutate()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Quitar '${name}' de Mi Tienda?`)) return
    const toastId = toast.loading('Eliminando...')
    
    setLocalProducts(prev => prev.filter(p => p.id !== id))
    
    const result = await removeStoreProduct(id)
    if (result.success) {
      toast.success('Producto eliminado', { id: toastId })
    } else {
      toast.error('Error al eliminar', { id: toastId })
      mutate()
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Search Bar */}
      <div className="relative mb-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Buscar en mi tienda..."
          className="pl-11 h-12 text-base bg-white shadow-sm border-gray-200 rounded-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-400 hover:text-gray-600"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button 
          onClick={() => setPriceFilter("all")}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
            priceFilter === "all" 
              ? "bg-gray-800 text-white border-gray-800" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Todos
        </button>
        <button 
          onClick={() => setPriceFilter("up")}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border flex items-center gap-1.5 ${
            priceFilter === "up" 
              ? "bg-red-100 text-red-700 border-red-200" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className={priceFilter !== "up" ? "text-red-500" : ""}>▲</span> Subieron
        </button>
        <button 
          onClick={() => setPriceFilter("down")}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border flex items-center gap-1.5 ${
            priceFilter === "down" 
              ? "bg-green-100 text-green-700 border-green-200" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className={priceFilter !== "down" ? "text-green-500" : ""}>▼</span> Bajaron
        </button>
        <button 
          onClick={() => setPriceFilter("same")}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border flex items-center gap-1.5 ${
            priceFilter === "same" 
              ? "bg-gray-200 text-gray-800 border-gray-300" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className={priceFilter !== "same" ? "text-gray-400" : "text-gray-600"}>=</span> Mantenido
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400 font-medium">Cargando tu tienda...</div>
      ) : localProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-gray-500 mb-4">Tu tienda está vacía.</div>
          <Link href="/catalog">
            <Button className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full px-6">
              Ir a Todos los Productos
            </Button>
          </Link>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 font-medium">No hay productos que coincidan con este filtro.</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="store-list" isDropDisabled={isDragDisabled}>
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-4 pb-8"
              >
                {filteredProducts.map((product, index) => {
                  const basePrice = product.manual_price ?? product.catalog_product?.price ?? 0
                  const previousPrice = product.catalog_product?.previous_price
                  const isUp = previousPrice && basePrice > previousPrice
                  const isDown = previousPrice && basePrice < previousPrice
                  
                  const diffPercent = previousPrice ? Math.abs((basePrice - previousPrice) / previousPrice * 100).toFixed(1) : 0
                  
                  const isMissingFromPdf = product.catalog_product && latestInfo && product.catalog_product.pdf_date !== latestInfo.pdf_date

                  return (
                    <Draggable 
                      key={product.id} 
                      draggableId={product.id} 
                      index={index}
                      isDragDisabled={isDragDisabled}
                    >
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-[var(--color-brand)] z-50' : ''}`}
                        >
                          {/* Drag Handle */}
                          {!isDragDisabled && (
                            <div 
                              {...provided.dragHandleProps}
                              className="px-2 pt-5 flex items-start text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                          )}

                          <div className={`flex-1 py-4 pr-4 ${isDragDisabled ? 'pl-4' : ''}`}>
                            {/* Header row */}
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-bold text-gray-800 text-base leading-tight pr-2">
                                {product.custom_name}
                              </h3>
                              <div className="flex space-x-2 shrink-0">
                                <button 
                                  onClick={() => setEditingProduct(product)}
                                  className="h-8 w-8 flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(product.id, product.custom_name)}
                                  className="h-8 w-8 flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Warnings */}
                            {product.is_pending && (
                              <div className="mb-3 inline-flex items-center text-xs font-medium bg-amber-50 text-amber-800 px-2 py-1 rounded">
                                <AlertCircle className="h-3 w-3 mr-1" /> Pendiente — no está en el PDF actual
                              </div>
                            )}
                            {isMissingFromPdf && !product.is_pending && (
                              <div className="mb-3 inline-flex items-center text-xs font-medium bg-red-50 text-red-800 px-2 py-1 rounded">
                                <AlertCircle className="h-3 w-3 mr-1" /> No está en el PDF más reciente
                              </div>
                            )}

                            {/* Price Rows */}
                            <div className="flex flex-col">
                              {/* Row 1: PDF Price */}
                              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-sm text-gray-500 font-medium">Precio PDF (caja/bulto)</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">{basePrice.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs</span>
                                  {isUp && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                      ▲ +{diffPercent}%
                                    </span>
                                  )}
                                  {isDown && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                      ▼ -{diffPercent}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 2+: Retail Prices */}
                              {product.margins.map((margin, i) => {
                                const unitPrice = (basePrice * (1 + margin / 100)) / product.quantity
                                return (
                                  <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-400 font-medium">+{margin}% - {product.quantity} unid.</span>
                                    <span className="font-bold text-[var(--color-brand-text)] text-base">
                                      {unitPrice.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs / unid.
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Edit Dialog */}
      {editingProduct && (
        <EditProductDialog 
          product={editingProduct} 
          open={!!editingProduct} 
          onOpenChange={(open) => !open && setEditingProduct(null)} 
          onSaved={() => { setEditingProduct(null); mutate(); }}
        />
      )}
    </div>
  )
}

function EditProductDialog({ product, open, onOpenChange, onSaved }: { product: StoreProduct, open: boolean, onOpenChange: (open: boolean) => void, onSaved: () => void }) {
  const [name, setName] = React.useState(product.custom_name)
  const [manualPrice, setManualPrice] = React.useState(product.manual_price !== null ? String(product.manual_price) : "")
  const [quantity, setQuantity] = React.useState(String(product.quantity))
  const [margins, setMargins] = React.useState<string[]>(product.margins.map(String))
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const parsedManualPrice = manualPrice.trim() !== "" ? parseFloat(manualPrice) : null
      const parsedQuantity = parseInt(quantity, 10) || 1
      const parsedMargins = margins.map(m => parseFloat(m) || 0)

      if (parsedMargins.length === 0) parsedMargins.push(0)

      const result = await updateStoreProduct(product.id, {
        custom_name: name,
        manual_price: parsedManualPrice,
        quantity: parsedQuantity,
        margins: parsedMargins
      })

      if (result.success) {
        toast.success("Producto actualizado")
        onSaved()
      } else {
        toast.error("Error al actualizar")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] p-0 overflow-hidden bg-white rounded-2xl">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center text-xl font-bold text-gray-900">
            <span className="mr-2">✏️</span> Editar Producto
          </DialogTitle>
        </DialogHeader>
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre en pantalla</Label>
            <Input className="h-11 rounded-lg border-gray-300 text-gray-900" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Precio Manual en Bs (Opcional — Sobrescribe el del PDF)</Label>
            <Input 
              type="number" 
              step="0.01" 
              className="h-11 rounded-lg border-gray-300 text-gray-900"
              value={manualPrice} 
              onChange={(e) => setManualPrice(e.target.value)} 
              placeholder="Dejar vacío para usar precio del PDF"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cantidad (Stock / Unidades por caja)</Label>
            <Input 
              type="number" 
              min="1"
              className="h-11 rounded-lg border-gray-300 text-gray-900"
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">% De Ganancia</Label>
            <div className="space-y-2.5">
              {margins.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    className="h-11 rounded-lg border-gray-300 text-gray-900"
                    value={m} 
                    onChange={(e) => {
                      const newM = [...margins]; newM[i] = e.target.value; setMargins(newM)
                    }} 
                  />
                  {margins.length > 1 && (
                    <button 
                      onClick={() => setMargins(margins.filter((_, idx) => idx !== i))}
                      className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setMargins([...margins, "20"])} 
                className="w-full mt-2 h-11 flex items-center justify-center border-2 border-dashed border-[var(--color-brand-light)] text-[var(--color-brand-text)] font-semibold rounded-lg hover:bg-[var(--color-brand-light)]/50 transition-colors text-sm"
              >
                + Agregar otro porcentaje
              </button>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 pt-0 border-t border-gray-100 mt-2 bg-gray-50">
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white h-12 rounded-lg font-bold text-base">
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
