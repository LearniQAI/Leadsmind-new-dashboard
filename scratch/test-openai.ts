import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Testing key:', apiKey?.substring(0, 15) + '...');
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'test',
        model: 'text-embedding-3-small'
      })
    });
    console.log('Status:', res.status, res.statusText);
    const body = await res.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testOpenAI();
