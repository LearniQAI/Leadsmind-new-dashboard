'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useItemPricing(workspaceId: string, contactId?: string) {
  const [priceListId, setPriceListId] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch the contact's assigned price list
  useEffect(() => {
    if (!contactId) return;

    const fetchPriceList = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('price_list_id')
        .eq('id', contactId)
        .single();
      
      if (!error && data?.price_list_id) {
        setPriceListId(data.price_list_id);
      }
    };

    fetchPriceList();
  }, [contactId, supabase]);

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
