const path = require('path');
const fs = require('fs');

const target = path.resolve(__dirname, '..', 'src/components/calendar/CalendarAnalyticsClient.tsx');
console.log('Path:', target);
console.log('Exists:', fs.existsSync(target));
