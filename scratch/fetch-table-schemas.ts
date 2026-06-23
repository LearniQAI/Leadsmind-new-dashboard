import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
  };
  
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log('Definitions keys:');
    const keys = Object.keys(data.definitions || {});
    console.log(keys.filter(k => k.includes('products') || k.includes('orders')));
    
    if (data.definitions?.products) {
      console.log('\n--- Products Properties ---');
      console.log(Object.keys(data.definitions.products.properties || {}));
    }
    if (data.definitions?.orders) {
      console.log('\n--- Orders Properties ---');
      console.log(Object.keys(data.definitions.orders.properties || {}));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
