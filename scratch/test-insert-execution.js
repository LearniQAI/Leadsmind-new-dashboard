const url = 'https://iejtgefkoiyrnyeedigr.supabase.co/rest/v1/workflow_executions';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTI5ODAsImV4cCI6MjA5MTIyODk4MH0.2iTCPctmy0J1jxcVTovX5PSJy-yDJtKGqfBge_hTIJA';

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    workflow_id: '205eae14-9c9d-4d5d-97e1-5e5d4364e383',
    workspace_id: 'cb61c47a-c13f-4e6f-8547-062e75122eb9',
    status: 'running',
    current_step: 1,
    context: {},
    started_at: new Date().toISOString()
  })
})
.then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
})
.catch(err => console.error(err));
