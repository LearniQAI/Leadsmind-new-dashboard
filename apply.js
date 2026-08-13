const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src', 'app', 'settings', 'integrations-hub', 'page.tsx');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /status: 'coming_soon', category: 'email_calendar'/g, 
  "status: 'available', category: 'email_calendar'"
);

fs.writeFileSync(p, c);
console.log("SUCCESS! The calendar buttons are now clickable in the UI.");