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
      const kycChecksDef = json.definitions.kyc_checks;
      if (kycChecksDef) {
        console.log('--- kyc_checks columns ---');
        console.log(Object.keys(kycChecksDef.properties));
      } else {
        console.log('kyc_checks definition not found in schema');
      }
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  });
});
