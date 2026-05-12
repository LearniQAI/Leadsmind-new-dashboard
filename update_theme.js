const fs = require('fs');
let content = fs.readFileSync('tailwind.config.js', 'utf8');

// Disabled white override to keep text-white legible across the app
content = content.replace(/card:\s*\{\s*DEFAULT:\s*'#[0-9a-fA-F]{6}',\s*\/\/\s*Deep Navy \(Forced\)/g, "card: { DEFAULT: '#FFFFFF', // True Light Mode card");
content = content.replace(/bgBody:\s*\{\s*DEFAULT:\s*'#[0-9a-fA-F]{6}',\s*\/\/\s*Deep Navy \(Forced\)/g, "bgBody: { DEFAULT: '#F8FAFC', // Slate 50");

fs.writeFileSync('tailwind.config.js', content);
console.log('Tailwind config updated.');
