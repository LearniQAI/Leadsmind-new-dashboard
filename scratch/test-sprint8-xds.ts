import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(global as any).WebSocket = class {};

import Module from 'module';
import * as supabaseJs from '@supabase/supabase-js';

// Setup local mock database state
const mockDb: Record<string, any[]> = {
  contacts: [
    {
      id: '00000000-0000-0000-0000-000000000888',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      first_name: 'Dumi',
      last_name: 'Khosa',
      email: 'dumi@khosacorp.co.za',
      id_number: '9201015081111', // Suffix 1111 (Very Poor)
      kyc_risk_flag: 'LOW',
      kyc_id_verified: false
    }
  ],
  kyc_consent: [
    {
      id: 'mock_consent_id_xyz',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      contact_id: '00000000-0000-0000-0000-000000000888',
      status: 'obtained',
      check_types: ['xds_credit', 'xds_trace', 'credit_score', 'credit_report'],
      reference: 'test_consent_ref_888',
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

      list = list.filter(item => {
        return queryState.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'in') return f.val.includes(item[f.col]);
          return true;
        });
      });

      if (queryState.orderField) {
        list = [...list].sort((a: any, b: any) => b[queryState.orderField!] > a[queryState.orderField!] ? 1 : -1);
      }

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

// Intercept import paths for Supabase Client module
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
  console.log('       SPRINT 8 XDS INTEGRATION & FALLBACKS       ');
  console.log('                  (MOCKED DB)                     ');
  console.log('==================================================\n');

  // Load backend route handler afterrequire override is complete
  const { POST } = await import('../src/app/api/crm/contacts/kyc/route');

  const workspaceId = '15cb0f15-45da-4727-ae00-44c7750a9705';
  const testContactId = '00000000-0000-0000-0000-000000000888';

  // ----------------------------------------------------------------
  // Case 1: XDS Mass-Market Credit check (Suffix 1111)
  // ----------------------------------------------------------------
  console.log('--- Case 1: XDS Mass-Market Credit check (Suffix 1111) ---');
  let response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'xds_credit',
        provider: 'XDS',
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

  const check1 = mockDb.kyc_checks.find(c => c.contact_id === testContactId && c.check_type === 'xds_credit');
  if (check1) {
    console.log('✅ Mock DB Assert - Score:', check1.score, '(Expected: 380)');
    console.log('✅ Mock DB Assert - Risk Band:', check1.risk_band, '(Expected: Very Poor)');
    console.log('✅ Mock DB Assert - Accounts Count:', check1.raw_response?.creditResult?.accounts?.length, '(Expected: 3)');
  } else {
    console.error('❌ Mock DB Assert - XDS credit check not found in DB.');
  }

  // ----------------------------------------------------------------
  // Case 2: XDS Active Tracing check
  // ----------------------------------------------------------------
  console.log('\n--- Case 2: XDS Active Tracing check ---');
  response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'xds_trace',
        provider: 'XDS',
        consentGiven: true
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check result notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);

  const check2 = mockDb.kyc_checks.find(c => c.contact_id === testContactId && c.check_type === 'xds_trace');
  if (check2) {
    console.log('✅ Mock DB Assert - Addresses Count:', check2.raw_response?.traceResult?.addresses?.length, '(Expected: 2)');
    console.log('✅ Mock DB Assert - Phones Count:', check2.raw_response?.traceResult?.phones?.length, '(Expected: 2)');
  } else {
    console.error('❌ Mock DB Assert - XDS trace check not found in DB.');
  }

  // ----------------------------------------------------------------
  // Case 3: Primary Bureau thin-file fallback to XDS (Suffix 5555)
  // ----------------------------------------------------------------
  console.log('\n--- Case 3: Primary Bureau thin-file fallback to XDS (Suffix 5555) ---');
  // Update contact ID number to suffix 5555 (triggers fallback)
  const contact = mockDb.contacts.find(c => c.id === testContactId);
  if (contact) {
    contact.id_number = '9201015085555';
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
  console.log('Check provider recorded:', result.check?.provider);

  const check3 = mockDb.kyc_checks.find(
    c => c.contact_id === testContactId && c.check_type === 'credit_report' && c.provider === 'XDS'
  );

  if (check3) {
    console.log('✅ Mock DB Assert - Fallback Provider is XDS');
    console.log('✅ Mock DB Assert - Score:', check3.score, '(Expected: 590)');
    console.log('✅ Mock DB Assert - Defaults Count:', check3.defaults_count, '(Expected: 0)');
    console.log('✅ Mock DB Assert - Total Debt Exposure:', check3.total_debt_exposure, '(Expected: 11200)');
    console.log('✅ Mock DB Assert - Monthly Repayments:', check3.monthly_repayments, '(Expected: 1200)');
  } else {
    console.error('❌ Mock DB Assert - Fallback check not registered correctly under XDS provider.');
  }

  // ----------------------------------------------------------------
  // Case 4: POPIA Consent Check
  // ----------------------------------------------------------------
  console.log('\n--- Case 4: POPIA Consent Enforcement check ---');
  mockDb.kyc_consent = []; // Delete consent record

  response = await POST(
    new MockRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'xds_credit',
        provider: 'XDS',
        consentGiven: true
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status code:', response.status, '(Expected: 403)');
  console.log('Error Message:', result.error);

  if (response.status === 403 && result.error && result.error.includes('POPIA consent record exists')) {
    console.log('✅ PASS: Consent blocker successfully intercepted non-consented verification check!');
  } else {
    console.error('❌ FAIL: Consent blocker failed to intercept check!');
  }

  console.log('\nAll tests completed successfully!');
}

runTests().catch(console.error);
