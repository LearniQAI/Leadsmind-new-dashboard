const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs
  .readdirSync(root)
  .filter((file) => fs.statSync(path.join(root, file)).isFile())
  .sort((a, b) => a.localeCompare(b));

const suffixOf = (file) => file.split('_').slice(1).join('_');
const isPhase = (file) => suffixOf(file).toLowerCase().startsWith('phase');
const isFix = (file) => {
  const suffix = suffixOf(file).toLowerCase();
  return (
    /^(fix_|add_|cleanup_|repair_|patch_|update_|alter_|harden_|replace_|remove_|rename_)/.test(suffix) ||
    /_fix$/.test(suffix)
  );
};

const phaseKey = (file) => {
  const suffix = suffixOf(file);
  const match = suffix.match(/^phase(\d+)/i);
  const phaseNumber = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  return [phaseNumber, suffix.toLowerCase(), file.toLowerCase()];
};

const nonPhaseKey = (file) => [suffixOf(file).toLowerCase(), file.toLowerCase()];

const phase = [];
const fix = [];
const other = [];
const affected = [];

for (const file of files) {
  if (isPhase(file)) {
    phase.push(file);
  } else if (isFix(file)) {
    fix.push(file);
  } else {
    other.push(file);
  }
}

phase.sort((a, b) => {
  const left = phaseKey(a);
  const right = phaseKey(b);
  return left[0] - right[0] || left[1].localeCompare(right[1]) || left[2].localeCompare(right[2]);
});
fix.sort((a, b) => {
  const left = nonPhaseKey(a);
  const right = nonPhaseKey(b);
  return left[0].localeCompare(right[0]) || left[1].localeCompare(right[1]);
});
other.sort((a, b) => {
  const left = nonPhaseKey(a);
  const right = nonPhaseKey(b);
  return left[0].localeCompare(right[0]) || left[1].localeCompare(right[1]);
});

let out = '';
out += '# Migration Rename Plan\n\n';
out += '## Current files sorted by name\n\n';
for (const file of files) {
  out += '- ' + file + '\n';
}
out += '\n## Classification\n\n';
out += '- Phase files: ' + phase.length + '\n';
out += '- Fix files: ' + fix.length + '\n';
out += '- Other patches: ' + other.length + '\n\n';
out += '## Rename order\n\n';

let phaseIndex = 1;
for (const file of phase) {
  const newName = String(20240101000000 + phaseIndex).padStart(14, '0') + '_' + suffixOf(file);
  out += '- ' + file + ' -> ' + newName + '\n';
  phaseIndex += 1;
}

let patchIndex = 1;
for (const file of fix) {
  let newName = String(20240601000000 + patchIndex).padStart(14, '0') + '_' + suffixOf(file);
  if (file.startsWith('2026')) {
    newName = '20260601' + newName.slice(8);
    affected.push('- ' + file + ' -> ' + newName);
  }
  out += '- ' + file + ' -> ' + newName + '\n';
  patchIndex += 1;
}
for (const file of other) {
  let newName = String(20240601000000 + patchIndex).padStart(14, '0') + '_' + suffixOf(file);
  if (file.startsWith('2026')) {
    newName = '20260601' + newName.slice(8);
    affected.push('- ' + file + ' -> ' + newName);
  }
  out += '- ' + file + ' -> ' + newName + '\n';
  patchIndex += 1;
}

const outPath = path.join(process.cwd(), 'scratch', 'migration_rename_plan.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, 'utf8');
const affectedPath = path.join(process.cwd(), 'scratch', 'migration_rename_plan_affected.md');
fs.writeFileSync(
  affectedPath,
  '# Affected Migration Renames\n\n' +
    '- 2026-origin files stay in the 20260601 range.\n' +
    '- No duplicate target timestamps were introduced.\n\n' +
    affected.join('\n') +
    '\n',
  'utf8'
);
console.log(outPath);
console.log(affectedPath);
console.log('files=' + files.length + ' phase=' + phase.length + ' fix=' + fix.length + ' other=' + other.length);
