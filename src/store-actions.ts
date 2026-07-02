"use server"

import { createClient } from '@/lib/supabase/server'
import { updateTag } from 'next/cache'

export async function addProductToStore(catalogProductId: string, customName: string, quantity: number = 1) {
  const supabase = await createClient()
  
  // Get max order_position
  const { data: maxPosData } = await supabase
    .from('store_products')
    .select('order_position')
    .order('order_position', { ascending: false })
    .limit(1)
  
  const newPos = maxPosData && maxPosData.length > 0 ? maxPosData[0].order_position + 1 : 0

  const { error } = await supabase
    .from('store_products')
    .insert({
      catalog_product_id: catalogProductId,
      custom_name: customName,
      quantity,
      margins: [0], // Default 0%
      order_position: newPos,
      is_pending: false
    })

  if (error) {
    console.error(error)
    return { success: false, error: 'Error al agregar a la tienda' }
  }

  updateTag('store')
  return { success: true }
}

export async function updateStoreProduct(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('store_products')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error(error)
    return { success: false, error: (error as Error).message || 'Error updating product' }
  }

  updateTag('store')
  return { success: true }
}

export async function removeStoreProduct(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('store_products')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    return { success: false, error: 'Error al eliminar el producto' }
  }

  updateTag('store')
  return { success: true }
}

export async function reorderStoreProducts(updates: { id: string, order_position: number }[]) {
  const supabase = await createClient()
  
  // Supabase JS doesn't have a bulk update by id elegantly, so we upsert with id
  // We need to fetch existing to not overwrite other fields, or just do individual updates
  // For small lists, individual updates are fine
  const promises = updates.map(u => 
    supabase.from('store_products').update({ order_position: u.order_position }).eq('id', u.id)
  )
  
  await Promise.all(promises)
  updateTag('store')
  return { success: true }
}
