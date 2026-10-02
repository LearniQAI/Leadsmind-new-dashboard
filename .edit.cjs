const fs = require('fs');

// --- blog post page ---
const pf = 'src/app/blog/[slug]/page.tsx';
let p = fs.readFileSync(pf, 'utf8');
p = p.replace("import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';", "import { sanitizeBlogHtml } from '@/lib/security/sanitizeBlogHtml';");
p = p.split('sanitizeRichTextHtml(').join('sanitizeBlogHtml(');
const a = p.indexOf('// TEMPORARY diagnostic wrapper');
const b = p.indexOf('async function renderPublicBlogPostPage');
if (a < 0 || b < 0) throw new Error('markers not found');
p = p.slice(0, a) + 'export default async function PublicBlogPostPage' + p.slice(b + 'async function renderPublicBlogPostPage'.length);
fs.writeFileSync(pf, p);

// --- next.config.js ---
const nf = 'next.config.js';
let n = fs.readFileSync(nf, 'utf8');
const inc = "            '/blog/[slug]': [\n                './node_modules/jsdom/**/*',\n                './node_modules/isomorphic-dompurify/**/*',\n            ],\n";
if (!n.includes(inc)) throw new Error('include block not found');
n = n.replace(inc, "            // '/blog/[slug]' no longer needs jsdom/isomorphic-dompurify: the blog post body is sanitized by\n            // the pure-JS lib/security/sanitizeBlogHtml.ts, so nothing DOM-based is traced for that route.\n");
fs.writeFileSync(nf, n);
console.log('ok');
