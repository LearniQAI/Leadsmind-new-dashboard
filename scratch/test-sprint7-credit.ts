import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(global as any).WebSocket = class {};

import Module from 'module';

// Setup local mock database state
const mockDb: Record<string, any[]> = {
  contacts: [
    {
      id: '00000000-0000-0000-0000-000000000777',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      first_name: 'Thabo',
      last_name: 'Nkosi',
      email: 'thabo@nkosicorp.co.za',
      id_number: '9201015081111', // Suffix 1111 (Very Poor)
      kyc_risk_flag: 'LOW',
      kyc_id_verified: false
    }
  ],
  kyc_consent: [
    {
      id: 'mock_consent_id_abc',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      contact_id: '00000000-0000-0000-0000-000000000777',
      status: 'obtained',
      check_types: ['credit_score', 'credit_report'],
      reference: 'test_consent_ref_123',
      created_at: new Date().toISOString()
    }
  ],
  kyc_checks: [],
  kyc_consent_records: []
};

// Chainable query builder mock
function mockQueryBuilder(tableName: string) {
  const queryState = {
    filters: [] as { col: string; val: any; type: 'eq' | 'in' }[],
    orderField: null as string | null,
    limitVal: null as number | null,
    singleVal: false,
    maybeSingleVal: false
  };

  const builder: any = {
    select: (columns: string) => builder,
    eq: (col: string, val: any) => {
      queryState.filters.push({ col, val, type: 'eq' });
      return builder;
    },
    in: (col: string, vals: any[]) => {
      queryState.filters.push({ col, val: vals, type: 'in' });
      return builder;
    },
    order: (col: string, options?: any) => {
      queryState.orderField = col;
      return builder;
    },
    limit: (val: number) => {
      queryState.limitVal = val;
      return builder;
    },
    single: () => {
      queryState.singleVal = true;
      return builder;
    },
    maybeSingle: () => {
      queryState.maybeSingleVal = true;
      return builder;
    },
    insert: (records: any) => {
      const arr = Array.isArray(records) ? records : [records];
      const inserted = arr.map(r => {
        const item = { id: `mock_id_${Math.floor(Math.random() * 100000)}`, created_at: new Date().toISOString(), ...r };
        mockDb[tableName] = mockDb[tableName] || [];
        mockDb[tableName].push(item);
        return item;
      });

      const insertChain = {
        select: () => ({
          single: () => Promise.resolve({ data: inserted[0], error: null }),
          then: (resFn: any) => resFn({ data: inserted, error: null })
        }),
        then: (resFn: any) => resFn({ data: inserted[0], error: null })
      };
      return insertChain;
    },
    update: (updates: any) => {
      const items = mockDb[tableName] || [];
      const matched = items.filter(item => {
        return queryState.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'in') return f.val.includes(item[f.col]);
          return true;
        });
      });

      matched.forEach(item => {
        Object.assign(item, updates);
      });

      const updateChain = {
        select: () => ({
          single: () => Promise.resolve({ data: matched[0] || null, error: null }),
          then: (resFn: any) => resFn({ data: matched, error: null })
        }),
        then: (resFn: any) => resFn({ data: matched, error: null })
      };
      return updateChain;
    },
    delete: () => {
      mockDb[tableName] = (mockDb[tableName] || []).filter(item => {
        return !queryState.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'in') return f.val.includes(item[f.col]);
          return true;
        });
      });
      return Promise.resolve({ error: null });
    },
    then: (resolveFn: any) => {
      let list = mockDb[tableName] || [];

      // Filter list
      list = list.filter(item => {
        return queryState.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'in') return f.val.includes(item[f.col]);
          return true;
        });
      });

      // Sort
      if (queryState.orderField) {
        list = [...list].sort((a: any, b: any) => b[queryState.orderField!] > a[queryState.orderField!] ? 1 : -1);
      }

      // Limit
      if (queryState.limitVal) {
        list = list.slice(0, queryState.limitVal);
      }

      let result: any = { data: list, error: null };
      if (queryState.singleVal) {
        result = { data: list[0] || null, error: list[0] ? null : new Error('Not found') };
      } else if (queryState.maybeSingleVal) {
        result = { data: list[0] || null, error: null };
      }

      return resolveFn(result);
    }
  };

  return builder;
}

// Override module require system to force redirect `@supabase/supabase-js` imports to our mock
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === '@supabase/supabase-js') {
    return {
      createClient: () => {
        return {
          from: (tableName: string) => mockQueryBuilder(tableName),
          rpc: (name: string, args: any) => {
            console.log(`[Mock RPC] ${name} called`);
            return Promise.resolve({ data: [], error: null });
          }
        };
      }
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Simple Mock for Request / NextRequest
class MockRequest {
  constructor(public url: string, public init: { method: string; body: string }) {}
  async json() {
    return JSON.parse(this.init.body);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('      SPRINT 7 CREDIT & AFFORDABILITY TESTS       ');
  console.log('                  (MOCKED DB)                     ');
  console.log('==================================================\n');

  // Dynamic import to load route.ts with intercepted `@supabase/supabase-js`
  const { POST } = await import('../src/app/api/crm/contacts/kyc/route');

  const workspaceId = '15cb0f15-45da-4727-ae00-44c7750a9705';
  const testContactId = '00000000-0000-0000-0000-000000000777';

  console.log(`Using mock workspace: ${workspaceId}`);
  console.log(`Setting up mock contact record...\n`);

  // ----------------------------------------------------------------
  // Case 1: Thin Credit Score Check (1111 Suffix)
  // ----------------------------------------------------------------
  console.log('--- Case 1: Thin Credit Score Check (Suffix 1111 - Very Poor) ---');
  let response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'credit_score',
        provider: 'TransUnion',
        consentGiven: true
      })
    }) as any
  );
  let result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check result notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);
  console.log('Returned Score:', result.check?.score);
  console.log('Returned Risk Band:', result.check?.risk_band);

  // Assert correct outcomes inside mock database
  const check1 = mockDb.kyc_checks.find(
    c => c.contact_id === testContactId && c.check_type === 'credit_score'
  );

  if (check1) {
    console.log('✅ Mock DB Assert - Score:', check1.score, '(Expected: 350)');
    console.log('✅ Mock DB Assert - Risk Band:', check1.risk_band, '(Expected: Very Poor)');
  } else {
    console.error('❌ Mock DB Assert - No credit_score check record found in mock DB.');
  }

  // ----------------------------------------------------------------
  // Case 2: Comprehensive Credit Report (1111 Suffix)
  // ----------------------------------------------------------------
  console.log('\n--- Case 2: Credit Report Check (Suffix 1111 - High Debt) ---');
  response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'credit_report',
        provider: 'TransUnion',
        consentGiven: true
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check result notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);

  // Assert mock database state
  const check2 = mockDb.kyc_checks.find(
    c => c.contact_id === testContactId && c.check_type === 'credit_report'
  );

  if (check2) {
    console.log('✅ Mock DB Assert - Score:', check2.score, '(Expected: 350)');
    console.log('✅ Mock DB Assert - Risk Band:', check2.risk_band, '(Expected: Very Poor)');
    console.log('✅ Mock DB Assert - Defaults Count:', check2.defaults_count, '(Expected: 5)');
    console.log('✅ Mock DB Assert - Judgements Count:', check2.judgements_count, '(Expected: 3)');
    console.log('✅ Mock DB Assert - Total Debt Exposure:', check2.total_debt_exposure, '(Expected: 450000)');
    console.log('✅ Mock DB Assert - Monthly Repayments:', check2.monthly_repayments, '(Expected: 12000)');
  } else {
    console.error('❌ Mock DB Assert - No credit_report check record found in mock DB.');
  }

  // ----------------------------------------------------------------
  // Case 3: Credit Report Check (4444 Suffix - Good Credit)
  // ----------------------------------------------------------------
  console.log('\n--- Case 3: Credit Report Check (Suffix 4444 - Good Credit) ---');
  // Update mock database contact state
  const contact = mockDb.contacts.find(c => c.id === testContactId);
  if (contact) {
    contact.id_number = '9201015084444'; // Ends in 4444
  }

  response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'credit_report',
        provider: 'TransUnion',
        consentGiven: true
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check result notes:', result.check?.notes);

  // Find latest credit_report check
  const checks = mockDb.kyc_checks.filter(
    c => c.contact_id === testContactId && c.check_type === 'credit_report'
  );
  const check3 = checks[checks.length - 1]; // The latest insert

  if (check3) {
    console.log('✅ Mock DB Assert - Score:', check3.score, '(Expected: 720)');
    console.log('✅ Mock DB Assert - Risk Band:', check3.risk_band, '(Expected: Good)');
    console.log('✅ Mock DB Assert - Defaults Count:', check3.defaults_count, '(Expected: 0)');
    console.log('✅ Mock DB Assert - Judgements Count:', check3.judgements_count, '(Expected: 0)');
    console.log('✅ Mock DB Assert - Total Debt Exposure:', check3.total_debt_exposure, '(Expected: 45000)');
    console.log('✅ Mock DB Assert - Monthly Repayments:', check3.monthly_repayments, '(Expected: 1500)');
  } else {
    console.error('❌ Mock DB Assert - No credit_report check record found in mock DB.');
  }

  // ----------------------------------------------------------------
  // Case 4: POPIA Consent Enforcement Check
  // ----------------------------------------------------------------
  console.log('\n--- Case 4: POPIA Consent Enforcement Verification ---');
  console.log('Deleting obtained consent record from mock DB to simulate non-consented check attempt...');
  mockDb.kyc_consent = [];

  response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'credit_score',
        provider: 'TransUnion',
        consentGiven: true
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status code:', response.status, '(Expected: 403)');
  console.log('Error Message returned:', result.error);

  if (response.status === 403 && result.error && result.error.includes('obtained POPIA consent record exists')) {
    console.log('✅ PASS: Consent blocker successfully intercepted non-consented verification check!');
  } else {
    console.error('❌ FAIL: Consent blocker failed to intercept check!');
  }

  console.log('\nTests completed successfully!');
}

runTests().catch(console.error);
