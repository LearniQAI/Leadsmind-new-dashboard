const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const planPath = path.join(process.cwd(), 'scratch', 'migration_rename_plan.md');
const lines = fs.readFileSync(planPath, 'utf8').split(/\r?\n/);
const moves = [];

for (const line of lines) {
  const match = line.match(/^\-\s+(\S+)\s+->\s+(\S+)$/);
  if (match) {
    moves.push([match[1], match[2]]);
  }
}

const existingMoves = moves.filter(([oldName]) =>
  fs.existsSync(path.join(process.cwd(), 'supabase', 'migrations', oldName))
);

if (existingMoves.length > 0) {
  cp.execFileSync(
    'git',
    ['add', '-N', '--', ...existingMoves.map(([oldName]) => path.join('supabase', 'migrations', oldName))],
    { stdio: 'inherit' }
  );
}

let moved = 0;
let skipped = 0;

for (const [oldName, newName] of moves) {
  if (oldName === newName) {
    skipped += 1;
    continue;
  }

  const oldPath = path.join(process.cwd(), 'supabase', 'migrations', oldName);
  const newPath = path.join(process.cwd(), 'supabase', 'migrations', newName);
  if (!fs.existsSync(oldPath)) {
    skipped += 1;
    continue;
  }

  cp.execFileSync('git', ['mv', '--', oldPath, newPath], { stdio: 'inherit' });
  moved += 1;
  if (moved % 25 === 0 || moved === existingMoves.length) {
    console.log('moved ' + moved + '/' + existingMoves.length + ' ' + oldName + ' -> ' + newName);
  }
}

console.log('DONE moved=' + moved + ' skipped=' + skipped + ' total=' + moves.length);