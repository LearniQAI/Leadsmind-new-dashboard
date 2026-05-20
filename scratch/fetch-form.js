const url = 'https://iejtgefkoiyrnyeedigr.supabase.co/rest/v1/forms?select=id,name,workspace_id,status&id=eq.98257328-c802-467d-96d4-5fca199206a6';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTI5ODAsImV4cCI6MjA5MTIyODk4MH0.2iTCPctmy0J1jxcVTovX5PSJy-yDJtKGqfBge_hTIJA';

fetch(url, {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('Form details:');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
