const https = require('https');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1Mjk4MCwiZXhwIjoyMDkxMjI4OTgwfQ.rY0HZ4ZntppETuLGZB5ptt27OBjnUmUMI5kOLxQqBX8";

const options = {
  hostname: 'iejtgefkoiyrnyeedigr.supabase.co',
  path: '/rest/v1/',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const paths = Object.keys(json.paths || {});
      console.log('All Swagger paths:');
      console.log(paths);
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  });
});
