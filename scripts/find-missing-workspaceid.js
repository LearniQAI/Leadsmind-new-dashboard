const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'src', 'app');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) return walk(p);
    if (/\.(ts|tsx)$/.test(ent.name)) return [p];
    return [];
  });
}

const wsRE = /\.eq\(\s*['\"]workspace_id['\"]\s*,\s*workspaceId\s*\)/;
const funcRE = /^(\s*)(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)\s*\(|^(\s*)(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/;

function findFunctionStart(lines, index) {
  for (let i = index; i >= 0; i--) {
    if (funcRE.test(lines[i])) return i;
  }
  return -1;
}

function findFunctionEnd(lines, start) {
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0 && i > start) return i;
  }
  return lines.length - 1;
}

const results = [];
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!wsRE.test(text)) continue;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (wsRE.test(lines[i])) {
      const start = findFunctionStart(lines, i);
      if (start === -1) continue;
      const end = findFunctionEnd(lines, start);
      const body = lines.slice(start, end + 1).join('\n');
      const workspaceIdDeclared = /\b(?:const|let|var)\s+workspaceId\b/.test(body) || /workspaceId\s*[:=]/.test(body) || lines[start].includes('workspaceId');
      if (!workspaceIdDeclared) {
        results.push({ file: path.relative(root, file), line: i + 1, functionStart: start + 1, signature: lines[start].trim() });
      }
    }
  }
}
console.log(JSON.stringify(results, null, 2));
console.log('TOTAL', results.length);
