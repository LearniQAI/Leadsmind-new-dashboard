const https = require('https');
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1Mjk4MCwiZXhwIjoyMDkxMjI4OTgwfQ.rY0HZ4ZntppETuLGZB5ptt27OBjnUmUMI5kOLxQqBX8";
const hostname = "iejtgefkoiyrnyeedigr.supabase.co";

const options = {
  hostname: hostname,
  path: '/rest/v1/',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  },
  timeout: 5000
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const paths = Object.keys(json.paths || {});
      const meetPaths = paths.filter(p => p.toLowerCase().includes('meet') || p.toLowerCase().includes('round_robin'));
      console.log('Matching paths:', meetPaths);
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  });
});
