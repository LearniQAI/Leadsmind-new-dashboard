// Minimal in-memory PostgREST stand-in for unit tests: select / eq / neq / in / not / is / order / limit / range /
// insert / update / upsert / delete, with `.select()` after a write returning the affected rows (so 0-row writes are
// observable), maybeSingle / single, and an optional forced error per table. Not a general client; enough for the
// server actions that scope every query by id + workspace_id.
export type Row = Record<string, any>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  writes: { table: string; op: string; rows?: any }[];
  failTables: Set<string>;
  from: (table: string) => any;
}

let seq = 0;

export function makeFakeDb(initial: Record<string, Row[]> = {}): FakeDb {
  const db: FakeDb = {
    tables: Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.map((r) => ({ ...r }))])),
    writes: [],
    failTables: new Set(),
    from(table: string) {
      const preds: ((r: Row) => boolean)[] = [];
      let op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
      let payload: any;
      let single: 'none' | 'maybe' | 'one' = 'none';
      let limit: number | null = null;
      let cols: string[] | null = null;
      const q: any = {
        select: (c?: string) => {
          if (op === 'select') cols = c && c !== '*' && !c.includes('(') ? c.split(',').map((x) => x.trim()) : null;
          return q;
        },
        eq: (c: string, v: any) => (preds.push((r) => r[c] === v), q),
        neq: (c: string, v: any) => (preds.push((r) => r[c] !== v), q),
        in: (c: string, vs: any[]) => (preds.push((r) => vs.includes(r[c])), q),
        not: (c: string, o: string, v: any) => (preds.push((r) => (o === 'is' ? r[c] !== v : true)), q),
        is: (c: string, v: any) => (preds.push((r) => r[c] === v), q),
        // PostgREST JSON path filter, e.g. filter('credentials->>phone_number_id', 'eq', 'x')
        filter: (c: string, _o: string, v: any) => {
          const [col, key] = c.split('->>');
          preds.push((r) => (key ? r[col]?.[key] : r[col]) === v);
          return q;
        },
        order: () => q,
        limit: (n: number) => ((limit = n), q),
        range: (a: number, b: number) => ((limit = b - a + 1), q),
        insert: (r: any) => ((op = 'insert'), (payload = r), q),
        update: (r: any) => ((op = 'update'), (payload = r), q),
        upsert: (r: any) => ((op = 'upsert'), (payload = r), q),
        delete: () => ((op = 'delete'), q),
        maybeSingle: () => ((single = 'maybe'), q),
        single: () => ((single = 'one'), q),
        then: (res: any, rej: any) => run().then(res, rej),
      };
      async function run() {
        if (db.failTables.has(table)) return { data: null, error: { message: `boom ${table}`, code: 'XX000' } };
        const rows = (db.tables[table] ??= []);
        let affected: Row[] = [];
        if (op === 'insert' || op === 'upsert') {
          const list = (Array.isArray(payload) ? payload : [payload]).map((r: Row) => ({ id: r.id ?? `${table}-${++seq}`, ...r }));
          rows.push(...list);
          affected = list;
          db.writes.push({ table, op, rows: Array.isArray(payload) ? list : list[0] });
        } else if (op === 'update') {
          affected = rows.filter((r) => preds.every((p) => p(r)));
          for (const r of affected) Object.assign(r, payload);
          db.writes.push({ table, op, rows: { patch: payload, count: affected.length } });
        } else if (op === 'delete') {
          affected = rows.filter((r) => preds.every((p) => p(r)));
          db.tables[table] = rows.filter((r) => !affected.includes(r));
          db.writes.push({ table, op, rows: { count: affected.length } });
        } else {
          affected = rows.filter((r) => preds.every((p) => p(r)));
        }
        if (limit != null) affected = affected.slice(0, limit);
        let out: any[] = affected;
        if (cols) out = affected.map((r) => Object.fromEntries(cols!.map((c) => [c, r[c]])));
        if (single === 'maybe') return { data: out[0] ?? null, error: null };
        if (single === 'one') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows', code: 'PGRST116' } };
        return { data: out, error: null };
      }
      return q;
    },
  };
  return db;
}

export const rowsWritten = (db: FakeDb) => db.writes.filter((w) => w.op !== 'select').length;
