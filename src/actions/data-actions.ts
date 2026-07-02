"use server"

import { createClient } from '@/lib/supabase/server'
import { StoreProduct, CatalogProduct } from '@/types'

export async function getStoreProducts(): Promise<StoreProduct[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('store_products')
    .select('*, catalog_product:catalog_products(*)')
    .order('order_position', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data as StoreProduct[]
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data as CatalogProduct[]
}

export async function getLatestUploadInfo() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('upload_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }
  
  return data
}
