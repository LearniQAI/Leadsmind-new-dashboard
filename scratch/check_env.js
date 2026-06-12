require('dotenv').config({ path: '.env.local' });
console.log("Environment variables keys:");
console.log(Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN') && !k.includes('PASSWORD')));
