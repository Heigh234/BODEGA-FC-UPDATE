"use server"

import { createClient } from '@/lib/supabase/server'
import { ShoppingList, ShoppingListItem } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getShoppingLists(): Promise<ShoppingList[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching shopping lists:', error)
    return []
  }
  return data || []
}

export async function createShoppingList(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ name })
    .select()
    .single()

  if (error) {
    console.error('Error creating shopping list:', error)
    return null
  }
  revalidatePath('/shopping')
  return data
}

export async function deleteShoppingList(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting list:', error)
    return false
  }
  revalidatePath('/shopping')
  return true
}

export async function getShoppingListItems(listId: string): Promise<ShoppingListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select(`
      *,
      catalog_product:catalog_products(*)
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching list items:', error)
    return []
  }
  return data || []
}

export async function addShoppingListItem(listId: string, catalogProductId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shopping_list_items')
    .insert({
      list_id: listId,
      catalog_product_id: catalogProductId,
      quantity: 1,
      currency_type: 'BS'
    })

  if (error) {
    console.error('Error adding list item:', error)
    return false
  }
  revalidatePath(`/shopping/${listId}`)
  return true
}

export async function updateShoppingListItem(itemId: string, updates: Partial<ShoppingListItem>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shopping_list_items')
    .update(updates)
    .eq('id', itemId)

  if (error) {
    console.error('Error updating list item:', error)
    return false
  }
  // The client uses SWR so it will revalidate itself on mutation
  return true
}

export async function deleteShoppingListItem(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting list item:', error)
    return false
  }
  return true
}
