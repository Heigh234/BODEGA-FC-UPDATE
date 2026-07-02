"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import { Upload, Store, ClipboardList, FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getLatestUploadInfo, getStoreProducts, getCatalogProducts } from "@/actions/data-actions"
import { processPdfAction } from "@/actions/pdf-actions"

export function Header() {
  const pathname = usePathname()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const { data: latestInfo, mutate: mutateInfo } = useSWR('latestInfo', getLatestUploadInfo)
  const { data: storeProducts, mutate: mutateStore } = useSWR('store', getStoreProducts)
  const { data: catalogProducts, mutate: mutateCatalog } = useSWR('catalog', getCatalogProducts)

  const storeCount = storeProducts?.length || 0
  const catalogCount = catalogProducts?.length || 0

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const toastId = toast.loading('Procesando PDF...')
    
    const formData = new FormData()
    formData.append('file', file)

    const result = await processPdfAction(formData)
    
    if (result.success) {
      toast.success(`Catálogo actualizado: ${result.count} productos procesados`, { id: toastId })
      mutateInfo()
      mutateStore()
      mutateCatalog()
    } else {
      toast.error(result.error || 'Ocurrió un error', { id: toastId })
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm flex flex-col">
      {/* Top Green Banner */}
      <div className="bg-[var(--color-brand)] text-white w-full">
        <div className="container mx-auto max-w-2xl px-4 py-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-md flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl leading-tight tracking-tight">Bodega FC</span>
              <span className="text-xs font-medium text-white/80">Lista de Precios Actualizada</span>
            </div>
          </div>
          
          <div>
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              className="font-medium bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white transition-colors rounded-lg px-3 py-1.5 h-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Cargar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Info Sub-banner */}
      {latestInfo && (
        <div className="bg-[#f3f4f6] border-b border-gray-200">
          <div className="container mx-auto max-w-2xl px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-gray-500" />
              <span>PDF del {latestInfo.pdf_date}</span>
            </div>
            <span>Tasa BCV: {latestInfo.bcv_rate?.toFixed(2)} Bs</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="container mx-auto max-w-2xl px-0">
        <div className="flex w-full">
          <Link 
            href="/"
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold border-b-[3px] transition-colors ${
              pathname === '/' 
                ? 'border-[var(--color-brand)] text-[var(--color-brand-text)]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Store className="mb-1 h-[18px] w-[18px]" />
            Mi Tienda
          </Link>
          <Link 
            href="/catalog"
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold border-b-[3px] transition-colors ${
              pathname === '/catalog' 
                ? 'border-[var(--color-brand)] text-[var(--color-brand-text)]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="mb-1 h-[18px] w-[18px]" />
            Catálogo
          </Link>
          <Link 
            href="/shopping"
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold border-b-[3px] transition-colors ${
              pathname.startsWith('/shopping') 
                ? 'border-[var(--color-brand)] text-[var(--color-brand-text)]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="mb-1 h-[18px] w-[18px]" />
            Compras
          </Link>
        </div>
      </div>
    </header>
  )
}
