const fetch = require('node-fetch'); // or use native fetch in node 18+

async function test() {
  console.log("Testing connection to Supabase Auth API...");
  try {
    const res = await fetch("https://iejtgefkoiyrnyeedigr.supabase.co/auth/v1/token?grant_type=password", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTI5ODAsImV4cCI6MjA5MTIyODk4MH0.2iTCPctmy0J1jxcVTovX5PSJy-yDJtKGqfBge_hTIJA'
      },
      body: JSON.stringify({
        email: 'admin@leadsmind.com',
        password: 'Password123!'
      })
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", json);
  } catch (err) {
    console.error("Error connecting:", err);
  }
}

test();
