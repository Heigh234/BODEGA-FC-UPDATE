"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ChevronLeft, Search, Plus, Minus, Trash2, DollarSign } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getShoppingListItems, addShoppingListItem, updateShoppingListItem, deleteShoppingListItem } from "@/actions/shopping-actions"
import { getCatalogProducts, getLatestUploadInfo, getStoreProducts } from "@/actions/data-actions"
import { toast } from "sonner"

export default function ShoppingListDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const listId = resolvedParams.id
  const router = useRouter()

  const { data: items, mutate: mutateItems } = useSWR(`shopping_items_${listId}`, () => getShoppingListItems(listId))
  const { data: catalog } = useSWR('catalog', getCatalogProducts)
  const { data: storeProducts } = useSWR('store', getStoreProducts)
  const { data: latestInfo } = useSWR('latestInfo', getLatestUploadInfo)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchSource, setSearchSource] = React.useState<'store' | 'catalog'>('store')

  // Filter catalog for search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    
    if (searchSource === 'store' && storeProducts) {
      return storeProducts
        .filter(p => p.custom_name.toLowerCase().includes(query) || p.catalog_product?.name.toLowerCase().includes(query))
        .slice(0, 5)
        .map(p => ({
          id: p.catalog_product_id!, // Will skip nulls below
          display_name: p.custom_name,
          price: p.catalog_product?.price || 0
        }))
        .filter(p => p.id) // Ensure valid
    } else if (searchSource === 'catalog' && catalog) {
      return catalog
        .filter(p => p.display_name.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          display_name: p.display_name,
          price: p.price
        }))
    }
    return []
  }, [searchQuery, catalog, storeProducts, searchSource])

  const handleAddItem = async (catalogProductId: string) => {
    const existing = items?.find(i => i.catalog_product_id === catalogProductId)
    if (existing) {
      toast.info('Este producto ya está en la lista')
      setSearchQuery("")
      return
    }

    const ok = await addShoppingListItem(listId, catalogProductId)
    if (ok) {
      toast.success('Agregado a la lista')
      setSearchQuery("")
      mutateItems()
    }
  }

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    if (newQty < 1) return
    // Optimistic update
    mutateItems(current => current?.map(i => i.id === itemId ? { ...i, quantity: newQty } : i), false)
    await updateShoppingListItem(itemId, { quantity: newQty })
    mutateItems()
  }

  const handleToggleCurrency = async (itemId: string, currentCurrency: 'BS' | 'USD') => {
    const newCurrency = currentCurrency === 'BS' ? 'USD' : 'BS'
    mutateItems(current => current?.map(i => i.id === itemId ? { ...i, currency_type: newCurrency } : i), false)
    await updateShoppingListItem(itemId, { currency_type: newCurrency })
    mutateItems()
  }

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto de tu lista de compras?')) {
      await deleteShoppingListItem(itemId)
      mutateItems()
    }
  }

  // Calculate Totals
  const totals = React.useMemo(() => {
    let bs = 0
    let usdItemsBs = 0
    
    items?.forEach(item => {
      const price = item.catalog_product?.price || 0
      const rowTotal = price * item.quantity
      if (item.currency_type === 'BS') {
        bs += rowTotal
      } else {
        usdItemsBs += rowTotal
      }
    })

    const bcv = latestInfo?.bcv_rate || 1
    const usd = usdItemsBs / bcv

    return { bs, usd, bcv }
  }, [items, latestInfo])

  return (
    <main className="container mx-auto max-w-2xl pb-32">
      {/* Header pegajoso */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/shopping">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Lista de Compras</h1>
        </div>

        {/* Toggle Buscador */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
          <button
            onClick={() => { setSearchSource('store'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              searchSource === 'store' 
                ? 'bg-white text-[var(--color-brand)] shadow-sm' 
                : 'text-gray-500'
            }`}
          >
            De Mi Tienda
          </button>
          <button
            onClick={() => { setSearchSource('catalog'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              searchSource === 'catalog' 
                ? 'bg-white text-[var(--color-brand)] shadow-sm' 
                : 'text-gray-500'
            }`}
          >
            Todo el Catálogo
          </button>
        </div>

        {/* Buscador Integrado */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder={searchSource === 'store' ? "Buscar en mis productos..." : "Buscar en todo el catálogo..."} 
            className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-[var(--color-brand)] h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
          />
          
          {/* Resultados flotantes */}
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50">
              {searchResults.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleAddItem(p.id)}
                  className="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex items-center justify-between cursor-pointer active:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 line-clamp-1">{p.display_name}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[var(--color-brand)] bg-[var(--color-brand)]/10">
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items?.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">La lista está vacía.</p>
            <p className="text-gray-400 text-xs mt-1">Busca productos arriba para agregarlos.</p>
          </div>
        ) : (
          items?.map((item) => (
            <Card key={item.id} className="overflow-hidden border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="p-3.5 flex flex-col gap-3">
                  {/* Fila 1: Nombre y Borrar */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight text-gray-900">
                      {item.catalog_product?.display_name || 'Producto Desconocido'}
                    </h3>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 -mt-1 -mr-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Fila 2: Controles de cantidad y moneda */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-600 hover:text-gray-900"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-600 hover:text-gray-900"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {item.catalog_product?.price.toLocaleString('es-VE')} Bs/caja
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleCurrency(item.id, item.currency_type)}
                        className={`flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-bold transition-colors border ${
                          item.currency_type === 'USD' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {item.currency_type === 'USD' ? (
                          <>Divisa <DollarSign className="h-3 w-3 ml-0.5" /></>
                        ) : (
                          'Bs'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sticky Bottom Totalizer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="container mx-auto max-w-2xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagar en Bs</span>
            <span className="text-xl font-black text-gray-900">
              {totals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="h-10 w-px bg-gray-200 mx-2"></div>
          
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Pagar en Divisa</span>
            <div className="flex items-center text-green-700">
              <DollarSign className="h-4 w-4 -mr-0.5" />
              <span className="text-xl font-black">
                {totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">Ref: {totals.bcv.toFixed(2)} Bs</span>
          </div>
        </div>
      </div>
    </main>
  )
}
