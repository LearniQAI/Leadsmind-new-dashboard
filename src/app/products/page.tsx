import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ProductsClient from './ProductsClient';
import { getProducts } from '@/app/actions/commerce';

export default async function ProductsPage() {
  const { data: products } = await getProducts();

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <ProductsClient initialProducts={products || []} />
      </div>
    </Wrapper>
  );
}
