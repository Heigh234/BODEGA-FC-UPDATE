"use client"

import * as React from "react"
import useSWR from "swr"
import { Search, Plus, Check } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getCatalogProducts, getStoreProducts } from "@/actions/data-actions"
import { addProductToStore } from "@/actions/store-actions"
import { toast } from "sonner"

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [priceFilter, setPriceFilter] = React.useState<"all" | "up" | "down" | "same">("all")
  
  const { data: catalogProducts, isLoading: isCatalogLoading } = useSWR('catalog', () => getCatalogProducts())
  const { data: storeProducts, mutate: mutateStore } = useSWR('store', () => getStoreProducts())

  const storeProductIds = React.useMemo(() => {
    return new Set(storeProducts?.map(p => p.catalog_product_id).filter(Boolean))
  }, [storeProducts])

  const filteredProducts = React.useMemo(() => {
    if (!catalogProducts) return []
    return catalogProducts.filter(p => {
      const lowerQuery = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.display_name.toLowerCase().includes(lowerQuery)
      
      if (!matchesSearch) return false

      if (priceFilter !== "all") {
        const isUp = p.previous_price && p.price > p.previous_price
        const isDown = p.previous_price && p.price < p.previous_price
        const isSame = !isUp && !isDown

        if (priceFilter === "up" && !isUp) return false
        if (priceFilter === "down" && !isDown) return false
        if (priceFilter === "same" && !isSame) return false
      }

      return true
    })
  }, [catalogProducts, searchQuery, priceFilter])

  const handleAdd = async (productId: string, displayName: string) => {
    const toastId = toast.loading('Agregando a Mi Tienda...')
    const result = await addProductToStore(productId, displayName, 1)
    
    if (result.success) {
      toast.success('Agregado correctamente', { id: toastId })
      mutateStore()
    } else {
      toast.error(result.error || 'Error al agregar', { id: toastId })
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
          placeholder="Buscar en todos los productos..."
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

      {isCatalogLoading ? (
        <div className="text-center py-8 text-gray-400 font-medium">Cargando catálogo...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 font-medium">No se encontraron productos.</div>
      ) : (
        <div className="space-y-4 pb-8">
          {filteredProducts.map(product => {
            const inStore = storeProductIds.has(product.id)
            const isUp = product.previous_price && product.price > product.previous_price
            const isDown = product.previous_price && product.price < product.previous_price
            const diffPercent = product.previous_price ? Math.abs((product.price - product.previous_price) / product.previous_price * 100).toFixed(1) : 0

            return (
              <Card key={product.id} className="p-4 flex justify-between items-center bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-col pr-4 min-w-0">
                  <div className="font-bold text-sm text-gray-800 uppercase leading-tight mb-1 truncate">
                    {product.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-base text-[var(--color-brand-text)]">
                      {product.price.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs
                    </div>
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
                
                <div className="shrink-0">
                  <button
                    disabled={inStore}
                    onClick={() => handleAdd(product.id, product.display_name)}
                    className={`flex items-center justify-center h-9 px-4 rounded-full font-bold text-sm transition-colors ${
                      inStore 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white shadow-sm"
                    }`}
                  >
                    {inStore ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4" /> En tienda
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1.5 h-4 w-4" /> Agregar
                      </>
                    )}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
