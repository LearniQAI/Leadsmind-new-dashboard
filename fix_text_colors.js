const fs = require('fs');
const path = 'c:/Users/User/Leadsmind-new-dashboard/src/components/pagesUI/apps/home/HomeDashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace all occurrences of 'text-' followed by color, ignoring if already '!text-'
content = content.replace(/(\s|"|')text-((?:\[#[A-Fa-f0-9]+\])|[a-z]+-\d+|white|black|primary|secondary)/g, (match, prefix, color) => {
    return `${prefix}!text-${color}`;
});

fs.writeFileSync(path, content, 'utf8');
console.log("Replaced text colors");
