/* eslint-disable no-console -- CLI backfill script; console output is the deliverable */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { withParentLinks } from '../../src/lib/builder/craftTree';

// One-time backfill for the Craft.js missing-`parent` bug (see src/lib/builder/craftTree.ts):
// hand-authored template JSON omitted each node's `parent`, which makes Craft's delete/move
// throw. The builder now repairs trees on load, but raw readers of the stored JSON still see
// the broken data until someone opens that page — this rewrites every stored tree once, using
// the exact same withParentLinks() the builder uses.
//
//   npx tsx scripts/db-checks/backfill-canvas-parent-links.ts            # dry run (default)
//   npx tsx scripts/db-checks/backfill-canvas-parent-links.ts backup     # snapshot affected rows
//   npx tsx scripts/db-checks/backfill-canvas-parent-links.ts write      # rewrite (needs backup)
//   npx tsx scripts/db-checks/backfill-canvas-parent-links.ts verify     # compare against backup
//
// Stored trees live in `pages.content` (lessons, website pages, funnel steps — one table, told
// apart by course_lesson_id / website_page_id / funnel_step_id) and `page_versions.content`
// (revision snapshots, restored verbatim into pages). `custom_builder_components` holds
// blueprints as a Craft NodeTree ({rootNodeId, nodes}), a different shape withParentLinks does
// not apply to — reported only.
//
// Writes run in ONE transaction with session_replication_role=replica so no user trigger fires:
// a parent link is editor metadata, not a content edit, so it must not bump updated_at, enqueue
// an AI re-ingest of the lesson (trg_pages_enqueue_ai_ingest), or archive a spurious
// "published" version (trigger_archive_version_on_publish). Every row is guarded on its
// pre-read updated_at (pages) and the transaction aborts unless every guarded row updated.

// --only=<id,...>: restrict every mode to these rows (a targeted re-run for one page).
// --tag=<suffix>: a separate backup table + local file for that run, so a later targeted run
// never collides with (or overwrites) an earlier run's backup. No tag = the original 2026-09-25 run.
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const ONLY = new Set((arg('only') ?? '').split(',').filter(Boolean));
const TAG = arg('tag');
if (TAG && !/^[a-z0-9_]+$/.test(TAG)) throw new Error('--tag must be [a-z0-9_]');
const BACKUP_TABLE = `public._backup_canvas_parent_links_20260925${TAG ? `_${TAG}` : ''}`;
const BACKUP_FILE = join(process.cwd(), 'scripts', 'db-checks', `.backfill-canvas-parent-links${TAG ? `.${TAG}` : ''}.backup.json`);

type Tbl = 'pages' | 'page_versions';
type Row = { tbl: Tbl; id: string; kind: string; raw: unknown; guard: string | null };
type Analysis = {
  isTree: boolean; isString: boolean; nodes: number;
  missing: number; wrong: number; orphans: number;
  changed: boolean; fixed?: Record<string, any>; strippedHash?: string; fixedStrippedHash?: string; fixedBad?: number;
};

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// jsonb does not preserve key order, so equality/hashes use a sorted-key canonical form.
const canon = (v: any): string =>
  Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  : JSON.stringify(v);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const stripParents = (t: Record<string, any>) =>
  Object.fromEntries(Object.entries(t).map(([k, n]) => {
    if (!n || typeof n !== 'object') return [k, n];
    const { parent: _p, ...rest } = n;
    return [k, rest];
  }));

function expectedParents(t: Record<string, any>) {
  const exp = new Map<string, string>();
  for (const [id, n] of Object.entries(t)) {
    if (!n || typeof n !== 'object') continue;
    for (const c of Array.isArray(n.nodes) ? n.nodes : []) if (t[c]) exp.set(c, id);
    for (const c of Object.values(n.linkedNodes || {}) as string[]) if (t[c]) exp.set(c, id);
  }
  return exp;
}

function analyse(raw: unknown): Analysis {
  const isString = typeof raw === 'string';
  let tree: any = raw;
  if (isString) { try { tree = JSON.parse(raw as string); } catch { tree = null; } }
  if (!tree || typeof tree !== 'object' || Array.isArray(tree) || !tree.ROOT) {
    return { isTree: false, isString, nodes: 0, missing: 0, wrong: 0, orphans: 0, changed: false };
  }
  const exp = expectedParents(tree);
  const ids = Object.keys(tree).filter((k) => k !== 'ROOT');
  const missing = ids.filter((k) => exp.has(k) && !tree[k]?.parent).length;
  const wrong = ids.filter((k) => exp.has(k) && tree[k]?.parent && tree[k].parent !== exp.get(k)).length;
  const orphans = ids.filter((k) => !exp.has(k)).length;

  const fixed = JSON.parse(withParentLinks(tree));
  const fixedExp = expectedParents(fixed);
  const fixedBad = [...fixedExp].filter(([c, p]) => fixed[c].parent !== p).length;
  return {
    isTree: true, isString, nodes: ids.length, missing, wrong, orphans,
    changed: canon(fixed) !== canon(tree), fixed,
    strippedHash: sha(canon(stripParents(tree))), fixedStrippedHash: sha(canon(stripParents(fixed))), fixedBad,
  };
}

async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await sb.from(table).select(cols).order('id').range(from, from + 499);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 500) return out;
  }
}

async function loadRows(): Promise<Row[]> {
  const pages = await fetchAll<any>('pages', 'id, content, course_lesson_id, website_page_id, funnel_step_id, type, updated_at');
  const versions = await fetchAll<any>('page_versions', 'id, content, page_id');
  return [
    ...pages.map((p): Row => ({
      tbl: 'pages', id: p.id, raw: p.content, guard: p.updated_at,
      kind: p.course_lesson_id ? 'lesson' : p.funnel_step_id ? 'funnel' : p.website_page_id ? 'website' : `other(${p.type ?? 'null'})`,
    })),
    ...versions.map((v): Row => ({ tbl: 'page_versions', id: v.id, raw: v.content, guard: null, kind: 'version' })),
  ];
}

function sql(file: string): string {
  return execFileSync('supabase', ['db', 'query', '--linked', '-o', 'csv', '-f', file], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
}
function sqlText(text: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'cpl-'));
  const f = join(dir, 'q.sql');
  writeFileSync(f, text);
  return sql(f);
}
const dq = (s: string) => {
  if (s.includes('$cpl$')) throw new Error('content contains the dollar-quote tag');
  return `$cpl$${s}$cpl$`;
};

function report(rows: Row[]) {
  const results = rows.map((r) => ({ r, a: analyse(r.raw) }));
  const groups = new Map<string, { rows: number; trees: number; affected: number; missing: number; wrong: number; nodes: number; orphans: number; strings: number }>();
  for (const { r, a } of results) {
    const key = `${r.tbl}:${r.kind}`;
    const g = groups.get(key) ?? { rows: 0, trees: 0, affected: 0, missing: 0, wrong: 0, nodes: 0, orphans: 0, strings: 0 };
    g.rows++; if (a.isTree) g.trees++; if (a.changed) { g.affected++; g.nodes += a.nodes; }
    g.missing += a.missing; g.wrong += a.wrong; g.orphans += a.orphans; if (a.isTree && a.isString) g.strings++;
    groups.set(key, g);
  }
  console.table(Object.fromEntries(groups));
  const affected = results.filter((x) => x.a.changed);
  console.log('\nAffected rows (blocks missing parent / total blocks):');
  for (const { r, a } of affected) {
    console.log(`  ${r.tbl.padEnd(13)} ${r.kind.padEnd(12)} ${r.id}  missing=${a.missing}/${a.nodes} wrong=${a.wrong} orphans=${a.orphans}${a.isString ? ' [string-scalar]' : ''}  postFixBad=${a.fixedBad} contentHashPreserved=${a.strippedHash === a.fixedStrippedHash}`);
  }
  const unsafe = affected.filter(({ a }) => a.fixedBad !== 0 || a.strippedHash !== a.fixedStrippedHash);
  console.log(`\nTOTAL affected=${affected.length} unsafe=${unsafe.length}`);
  return { results, affected, unsafe };
}

async function main() {
  const mode = process.argv[2] ?? 'dry-run';
  const rows = (await loadRows()).filter((r) => !ONLY.size || ONLY.has(r.id));
  if (ONLY.size && rows.length !== ONLY.size) throw new Error(`--only matched ${rows.length} of ${ONLY.size} ids`);

  if (mode === 'dry-run') {
    report(rows);
    const { data: bps, error } = await sb.from('custom_builder_components').select('id, content');
    if (error) throw error;
    const shapes = (bps ?? []).map((b: any) => {
      const c = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
      return c?.rootNodeId && c?.nodes ? 'NodeTree' : c?.ROOT ? 'SerializedTree' : 'other';
    });
    console.log(`\ncustom_builder_components (report only): ${shapes.length} rows`, shapes.reduce((m: any, s) => ((m[s] = (m[s] ?? 0) + 1), m), {}));
    return;
  }

  if (mode === 'backup') {
    const { affected, unsafe } = report(rows);
    if (unsafe.length) throw new Error('unsafe rows — refusing to back up/write');
    if (!affected.length) { console.log('Nothing to back up.'); return; }
    if (existsSync(BACKUP_FILE)) throw new Error(`${BACKUP_FILE} already exists — use a new --tag`);
    const snapshot = affected.map(({ r, a }) => ({ tbl: r.tbl, id: r.id, kind: r.kind, guard: r.guard, raw: r.raw, rawHash: sha(canon(r.raw)), strippedHash: a.strippedHash }));
    writeFileSync(BACKUP_FILE, JSON.stringify(snapshot, null, 1));
    const ids = (t: Tbl) => affected.filter(({ r }) => r.tbl === t).map(({ r }) => `'${r.id}'`).join(',') || 'NULL';
    // Server-side copy of the exact stored values (not re-serialised by this script). RLS on with
    // no policies + grants revoked: it is in the API-exposed public schema, so it must be
    // unreadable to anon/authenticated. Drop it once the backfill has been signed off.
    console.log(sqlText(`
      create table ${BACKUP_TABLE} as
        select 'pages'::text as tbl, id, content, updated_at as guard, now() as backed_up_at from public.pages where id in (${ids('pages')})
        union all
        select 'page_versions', id, content, null::timestamptz, now() from public.page_versions where id in (${ids('page_versions')});
      alter table ${BACKUP_TABLE} enable row level security;
      revoke all on ${BACKUP_TABLE} from anon, authenticated;
      select tbl, count(*) from ${BACKUP_TABLE} group by tbl;`));
    console.log(`Local snapshot: ${BACKUP_FILE} (${snapshot.length} rows)`);
    return;
  }

  // `probe` = the exact `write` transaction, but it reports side-effect checks and ROLLS BACK.
  if (mode === 'write' || mode === 'probe') {
    const probe = mode === 'probe';
    // --exclude=<page id,...>: skip rows that are open in a live builder session — its next
    // autosave would overwrite the repair anyway (and the updated_at guard would abort the batch).
    const exclude = new Set((process.argv.find((a) => a.startsWith('--exclude='))?.slice(10) ?? '').split(',').filter(Boolean));
    const report_ = report(rows);
    const { unsafe } = report_;
    const affected = report_.affected.filter(({ r }) => !exclude.has(r.id));
    if (exclude.size) console.log(`Excluding ${exclude.size} row(s): ${[...exclude].join(', ')} -> writing ${affected.length}`);
    if (unsafe.length) throw new Error('unsafe rows — refusing to write');
    if (!probe) {
      if (!existsSync(BACKUP_FILE)) throw new Error('run `backup` first');
      const backup = JSON.parse(readFileSync(BACKUP_FILE, 'utf8')) as any[];
      // the backup must hold each row's CURRENT content, not just its id — otherwise a row edited
      // since the backup would be rewritten with no restorable copy of what it held just before
      const backedHash = new Map(backup.map((b) => [`${b.tbl}:${b.id}`, b.rawHash]));
      const stale = affected.filter(({ r }) => backedHash.get(`${r.tbl}:${r.id}`) !== sha(canon(r.raw)));
      if (stale.length) throw new Error(`${stale.length} affected row(s) missing from or changed since the backup (${stale.map(({ r }) => r.id).join(', ')}) — re-run backup`);
    }
    if (!affected.length) { console.log('Nothing to write — already correct (idempotent no-op).'); return; }
    const pageIds = affected.filter(({ r }) => r.tbl === 'pages').map(({ r }) => `'${r.id}'`).join(',') || 'NULL';
    const sideEffects = `(select count(*) from public.page_versions) as versions, (select count(*) from public.lms_ai_ingest_queue) as ingest_queue, (select max(requested_at) from public.lms_ai_ingest_queue) as ingest_latest, (select string_agg(updated_at::text, '|' order by id) from public.pages where id in (${pageIds})) as page_updated_ats, (select count(*) from public.pages p, jsonb_each(case jsonb_typeof(p.content) when 'string' then (p.content #>> '{}')::jsonb else p.content end) e where p.id in (${pageIds}) and e.key <> 'ROOT' and e.value->>'parent' is null) as nodes_missing_parent`;

    const newValue = (a: Analysis) => {
      const json = JSON.stringify(a.fixed);
      // preserve the stored representation: string-scalar rows stay string scalars
      return a.isString ? `to_jsonb(${dq(json)}::text)` : `${dq(json)}::jsonb`;
    };
    const stmts = affected.map(({ r, a }) => r.tbl === 'pages'
      ? `update public.pages set content = ${newValue(a)} where id = '${r.id}' and updated_at = '${r.guard}'::timestamptz; get diagnostics n = row_count; total := total + n;`
      : `update public.page_versions set content = ${newValue(a)} where id = '${r.id}'; get diagnostics n = row_count; total := total + n;`);
    const out = sqlText(`
      begin;
      ${probe ? `create temp table _before on commit drop as select ${sideEffects};` : ''}
      set local session_replication_role = replica;
      do $do$
      declare n int; total int := 0;
      begin
        ${stmts.join('\n        ')}
        if total <> ${affected.length} then
          raise exception 'backfill aborted: % of ${affected.length} rows updated (concurrent edit?)', total;
        end if;
      end $do$;
      ${probe
        ? `set local session_replication_role = origin;
      select 'before' as phase, * from _before union all select 'after', ${sideEffects};
      rollback;`
        : `select ${affected.length} as rows_written;
      commit;`}`);
    console.log(out);
    return;
  }

  if (mode === 'verify') {
    const backup = JSON.parse(readFileSync(BACKUP_FILE, 'utf8')) as any[];
    const byKey = new Map(rows.map((r) => [`${r.tbl}:${r.id}`, r]));
    let ok = 0;
    for (const b of backup) {
      const r = byKey.get(`${b.tbl}:${b.id}`);
      if (!r) { console.log(`MISSING ${b.tbl} ${b.id}`); continue; }
      const a = analyse(r.raw);
      const checks = {
        stillTree: a.isTree,
        sameRepresentation: a.isString === (typeof b.raw === 'string'),
        missing0: a.missing === 0,
        wrong0: a.wrong === 0,
        idempotent: !a.changed,
        contentOtherwiseIdentical: a.strippedHash === b.strippedHash,
        nodeCountSame: a.nodes === analyse(b.raw).nodes,
        updatedAtUntouched: b.tbl !== 'pages' || r.guard === b.guard,
      };
      const pass = Object.values(checks).every(Boolean);
      if (pass) ok++;
      console.log(`${pass ? 'PASS' : 'FAIL'} ${b.tbl.padEnd(13)} ${b.kind.padEnd(8)} ${b.id} nodes=${a.nodes}`, pass ? '' : checks);
    }
    console.log(`\nverify: ${ok}/${backup.length} rows pass`);
    return;
  }

  throw new Error(`unknown mode ${mode}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
