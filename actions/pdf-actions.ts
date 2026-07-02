"use server"

import { PDFParse } from 'pdf-parse'
import { createClient } from '@/lib/supabase/server'
import { revalidateTag, updateTag } from 'next/cache'

function capitalizeTitle(text: string) {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

function cleanProductName(rawName: string) {
  let cleanName = rawName.replace(/\s+X\s+\d+\s*(UNI|UNID|UNIDAD|PQ|PQTE)?\b/i, '')
  cleanName = cleanName.replace(/\s+UNIDAD\b/i, '')
  return capitalizeTitle(cleanName)
}

function parsePrice(rawPrice: string) {
  let cleaned = rawPrice.replace(/\s+/g, '')
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.')
    const lastComma = cleaned.lastIndexOf(',')
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }
  return parseFloat(cleaned)
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarityScore(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / parseFloat(longerLength.toString());
}

export async function processPdfAction(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No se seleccionó ningún archivo' }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const parser = new PDFParse({ data: buffer })
    let text = ''
    try {
      const result = await parser.getText()
      text = result.text
    } finally {
      await parser.destroy()
    }

    // 1. Extract Date
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*FECHA/i)
    const pdfDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('es-VE')

    // 2. Extract BCV Rate
    const bcvMatch = text.match(/TASA DEL DIA[^:]*:\s*([\d\s\.,]+)/i)
    let bcvRate = 0
    if (bcvMatch) {
      bcvRate = parsePrice(bcvMatch[1])
    }

    // 3. Extract Products
    const lines = text.split('\n')
    const products: { name: string, display_name: string, price: number }[] = []

    for (const line of lines) {
      const match = line.match(/Bs\s+([\d\s\.,]+)\s+(.+)/)
      if (match) {
        const rawPrice = match[1]
        const rawName = match[2].trim()
        if (rawName.toLowerCase().includes('descripcion del producto')) continue
        
        products.push({
          name: rawName,
          display_name: cleanProductName(rawName),
          price: parsePrice(rawPrice)
        })
      }
    }

    if (products.length === 0) {
      return { success: false, error: 'No se encontraron productos en el PDF. Verifica el formato.' }
    }

    // 4. Database Sync with Fuzzy Matching
    const supabase = await createClient()

    const { data: existingCatalog } = await supabase
      .from('catalog_products')
      .select('id, name, price, pdf_date')

    const existingMap = new Map(existingCatalog?.map(p => [p.name.toLowerCase(), p]))
    
    const toInsert: any[] = []
    const toUpdate: any[] = []

    for (const p of products) {
      const pNameLower = p.name.toLowerCase()
      const exactMatch = existingMap.get(pNameLower)
      
      if (exactMatch) {
        // Exact match found
        toUpdate.push({
          id: exactMatch.id,
          name: p.name,
          display_name: p.display_name,
          price: p.price,
          previous_price: exactMatch.price !== p.price ? exactMatch.price : undefined,
          pdf_date: pdfDate,
          bcv_rate: bcvRate,
          updated_at: new Date().toISOString()
        })
        existingMap.delete(pNameLower) // Remove so we don't fuzzy match against it
      } else {
        // No exact match, try fuzzy match against remaining unmatched products
        let bestMatch = null
        let highestScore = 0
        
        for (const [oldNameLower, oldItem] of existingMap.entries()) {
          const score = similarityScore(pNameLower, oldNameLower)
          if (score > highestScore) {
            highestScore = score
            bestMatch = oldItem
          }
        }
        
        // Threshold: 85% similarity
        if (highestScore >= 0.85 && bestMatch) {
          // Safeguard: If numbers (digits) differ, it's likely a weight/size change (e.g. 1kg vs 2kg), not a typo.
          const newNumbers = p.name.match(/\d+/g)?.join(',') || ''
          const oldNumbers = bestMatch.name.match(/\d+/g)?.join(',') || ''

          if (newNumbers === oldNumbers) {
            toUpdate.push({
              id: bestMatch.id,
              name: p.name, // The NEW corrected name
              display_name: p.display_name,
              price: p.price,
              previous_price: bestMatch.price !== p.price ? bestMatch.price : undefined,
              pdf_date: pdfDate,
              bcv_rate: bcvRate,
              updated_at: new Date().toISOString()
            })
            existingMap.delete(bestMatch.name.toLowerCase())
          } else {
            // Numbers changed, treat as a brand new product
            toInsert.push({
              name: p.name,
              display_name: p.display_name,
              price: p.price,
              previous_price: null,
              pdf_date: pdfDate,
              bcv_rate: bcvRate,
              updated_at: new Date().toISOString()
            })
          }
        } else {
          // Brand new product
          toInsert.push({
            name: p.name,
            display_name: p.display_name,
            price: p.price,
            previous_price: null,
            pdf_date: pdfDate,
            bcv_rate: bcvRate,
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    // Execute DB operations
    if (toUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('catalog_products')
        .upsert(toUpdate, { onConflict: 'id' })
        
      if (updateError) {
        console.error("Update Error:", updateError)
        return { success: false, error: 'Error al actualizar productos existentes.' }
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('catalog_products')
        .upsert(toInsert, { onConflict: 'name' })
        
      if (insertError) {
        console.error("Insert Error:", insertError)
        return { success: false, error: 'Error al insertar productos nuevos.' }
      }
    }

    // Clean up phantom products from today
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    await supabase
      .from('catalog_products')
      .delete()
      .eq('pdf_date', pdfDate)
      .lt('updated_at', oneHourAgo)

    // Save History
    await supabase
      .from('upload_history')
      .insert({
        filename: file.name,
        pdf_date: pdfDate,
        bcv_rate: bcvRate,
        product_count: products.length
      })

    updateTag('catalog')
    updateTag('store')
    updateTag('history')

    return { success: true, count: products.length }

  } catch (err: any) {
    console.error(err)
    return { success: false, error: 'Error inesperado procesando el PDF: ' + err.message }
  }
}
