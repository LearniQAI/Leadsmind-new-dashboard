import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing in PromptEngine/Datasource environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Built-in in-memory database mock storage for unit testing and offline execution
let mockDbStore: Record<string, any[]> = {};

export function setMockDbStore(store: Record<string, any[]>) {
  mockDbStore = store;
}

export function getMockDbStore() {
  return mockDbStore;
}

class QueryBuilder {
  private tableName: string;
  private conditions: Record<string, any> = {};
  private operators: { column: string; op: string; val: any }[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  where(conditions: Record<string, any> | string, operator?: string, value?: any) {
    if (typeof conditions === 'string') {
      if (operator && value !== undefined) {
        this.operators.push({ column: conditions, op: operator, val: value });
      }
    } else {
      this.conditions = { ...this.conditions, ...conditions };
    }
    return this;
  }

  private matchesMock(item: any): boolean {
    const matchesEq = Object.entries(this.conditions).every(([k, v]) => item[k] === v);
    const matchesOp = this.operators.every(op => {
      const val = item[op.column];
      if (op.op === '>=') return val >= op.val;
      if (op.op === '<=') return val <= op.val;
      if (op.op === '>') return val > op.val;
      if (op.op === '<') return val < op.val;
      if (op.op === '=') return val === op.val;
      if (op.op === '!=') return val !== op.val;
      return true;
    });
    return matchesEq && matchesOp;
  }

  private applyFilters(query: any) {
    let q = query;
    for (const [key, val] of Object.entries(this.conditions)) {
      q = q.eq(key, val);
    }
    for (const op of this.operators) {
      if (op.op === '>=') q = q.gte(op.column, op.val);
      else if (op.op === '<=') q = q.lte(op.column, op.val);
      else if (op.op === '>') q = q.gt(op.column, op.val);
      else if (op.op === '<') q = q.lt(op.column, op.val);
      else if (op.op === '=') q = q.eq(op.column, op.val);
      else if (op.op === '!=') q = q.neq(op.column, op.val);
    }
    return q;
  }

  async then(onfulfilled?: (value: any[]) => any, onrejected?: (error: any) => any): Promise<any> {
    try {
      let data;
      if (process.env.MOCK_DB === 'true') {
        const list = mockDbStore[this.tableName] || [];
        data = list.filter((item) => this.matchesMock(item));
      } else {
        let query = supabase.from(this.tableName).select('*');
        query = this.applyFilters(query);
        const res = await query;
        if (res.error) throw res.error;
        data = res.data || [];
      }
      return onfulfilled ? onfulfilled(data) : data;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  async first() {
    if (process.env.MOCK_DB === 'true') {
      const list = mockDbStore[this.tableName] || [];
      const match = list.find((item) => this.matchesMock(item));
      return match || null;
    }

    let query = supabase.from(this.tableName).select('*');
    query = this.applyFilters(query);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error(`[DB Adapter] error on first() for ${this.tableName}:`, error.message);
      return null;
    }
    return data;
  }

  async insert(payload: any) {
    if (process.env.MOCK_DB === 'true') {
      const list = mockDbStore[this.tableName] || [];
      const newRecord = { id: 'inserted-' + Date.now(), ...payload };
      list.push(newRecord);
      mockDbStore[this.tableName] = list;
      return [newRecord];
    }

    const { data, error } = await supabase.from(this.tableName).insert(payload).select();
    if (error) {
      console.error(`[DB Adapter] error on insert() for ${this.tableName}:`, error.message);
      throw new Error(`DB error on insert(): ${error.message}`);
    }
    return data;
  }

  async update(payload: any) {
    if (process.env.MOCK_DB === 'true') {
      const list = mockDbStore[this.tableName] || [];
      const recordIndex = list.findIndex((item) => this.matchesMock(item));
      if (recordIndex !== -1) {
        list[recordIndex] = { ...list[recordIndex], ...payload };
        mockDbStore[this.tableName] = list;
        return [list[recordIndex]];
      }
      return [];
    }

    let query = supabase.from(this.tableName).update(payload);
    query = this.applyFilters(query);
    const { data, error } = await query.select();
    if (error) {
      console.error(`[DB Adapter] error on update() for ${this.tableName}:`, error.message);
      throw new Error(`DB error on update(): ${error.message}`);
    }
    return data;
  }

  async increment(column: string, amount: number) {
    const record = await this.first();
    if (!record) {
      throw new Error(`[DB Adapter] Record not found to increment on ${this.tableName}`);
    }
    const currentVal = record[column] || 0;
    const newVal = currentVal + amount;
    return this.update({ [column]: newVal });
  }
}

export function db(tableName: string) {
  return new QueryBuilder(tableName);
}
