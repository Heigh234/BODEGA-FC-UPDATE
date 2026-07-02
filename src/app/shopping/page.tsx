"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Plus, Trash2, ChevronRight, ClipboardList } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getShoppingLists, createShoppingList, deleteShoppingList } from "@/actions/shopping-actions"

export default function ShoppingListsPage() {
  const router = useRouter()
  const { data: lists, mutate } = useSWR('shopping_lists', () => getShoppingLists())
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreateList = async () => {
    setIsCreating(true)
    const formatter = new Intl.DateTimeFormat('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
    const name = `Compra ${formatter.format(new Date())}`
    const newList = await createShoppingList(name)
    if (newList) {
      await mutate()
      router.push(`/shopping/${newList.id}`)
    }
    setIsCreating(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('¿Estás seguro de eliminar esta lista?')) {
      await deleteShoppingList(id)
      mutate()
    }
  }

  return (
    <main className="container mx-auto max-w-2xl p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Listas de Compras</h1>
          <p className="text-sm text-gray-500">Planifica tu visita a la distribuidora</p>
        </div>
      </div>

      <div className="space-y-3">
        {lists?.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl">
            <div className="bg-gray-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No hay listas creadas</h3>
            <p className="text-xs text-gray-500 mt-1">
              Crea tu primera lista para empezar a anotar lo que falta en la bodega.
            </p>
          </div>
        ) : (
          lists?.map((list) => (
            <Link key={list.id} href={`/shopping/${list.id}`}>
              <Card className="hover:border-[var(--color-brand)] transition-colors cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#f3f4f6] p-2.5 rounded-lg group-hover:bg-[var(--color-brand)]/10 transition-colors">
                      <ClipboardList className="h-5 w-5 text-gray-500 group-hover:text-[var(--color-brand)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{list.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Creada el {new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(list.created_at)).replace(',', '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleDelete(list.id, e)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 md:right-auto md:ml-[580px]">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg shadow-[var(--color-brand)]/30 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white"
          onClick={handleCreateList}
          disabled={isCreating}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </main>
  )
}
