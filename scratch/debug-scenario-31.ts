async function main() {
  const query = "recipe for homemade chocolate fudge brownies";
  console.log(`Sending query: "${query}"`);
  try {
    const res = await fetch('http://localhost:3000/api/support/lena/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, history: [] })
    });
    console.log('Status Code:', res.status);
    const body = await res.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

main();
