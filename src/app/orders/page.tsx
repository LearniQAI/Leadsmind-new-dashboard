import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import OrdersClient from './OrdersClient';
import { getOrders } from '@/app/actions/operations';

export default async function OrdersPage() {
  const { data: orders } = await getOrders();

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <OrdersClient initialOrders={orders || []} />
      </div>
    </Wrapper>
  );
}
