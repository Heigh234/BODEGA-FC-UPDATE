export interface CatalogProduct {
  id: string
  name: string
  display_name: string
  price: number
  previous_price: number | null
  pdf_date: string | null
  bcv_rate: number | null
  updated_at: string
}

export interface StoreProduct {
  id: string
  catalog_product_id: string | null
  custom_name: string
  manual_price: number | null
  quantity: number
  margins: number[]
  order_position: number
  is_pending: boolean
  updated_at: string
  catalog_product?: CatalogProduct | null
}

export interface UploadHistory {
  id: string
  filename: string
  pdf_date: string
  bcv_rate: number
  product_count: number
  created_at: string
}

export interface ShoppingList {
  id: string
  name: string
  created_at: string
  is_completed: boolean
}

export interface ShoppingListItem {
  id: string
  list_id: string
  catalog_product_id: string
  quantity: number
  currency_type: 'BS' | 'USD'
  created_at: string
  catalog_product?: CatalogProduct
}
