-- Migration 0001: Shopping Lists

-- Create Shopping Lists table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT false
);

-- Create Shopping List Items table
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  catalog_product_id UUID REFERENCES catalog_products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL,
  currency_type TEXT DEFAULT 'BS' CHECK (currency_type IN ('BS', 'USD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, catalog_product_id) -- A product should only be once per list
);
