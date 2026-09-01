'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useItemPricing(workspaceId: string, contactId?: string) {
  // Per-contact price-list assignment is UNBUILT: price_lists / price_list_items tables
  // exist, but there is no column or link table assigning a price list to a contact
  // (contacts has no price_list_id). The previous effect queried a nonexistent
  // contacts.price_list_id and silently swallowed the error. Until an assignment mechanism
  // exists, no per-contact price list is resolved and standard pricing is always used.
  const [priceListId] = useState<string | null>(null);
  const supabase = createClient();

  /**
   * Returns the override price if found, otherwise returns null
   */
  const getProductPrice = async (productId: string, standardPrice: number) => {
    if (!priceListId) return standardPrice;

    const { data, error } = await supabase
      .from('price_list_items')
      .select('custom_price')
      .eq('price_list_id', priceListId)
      .eq('product_id', productId)
      .single();

    if (!error && data) {
      return Number(data.custom_price);
    }

    return standardPrice;
  };

  return { getProductPrice, priceListId };
}
