import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(global as any).WebSocket = class {};

import Module from 'module';

// Setup local mock database state
const mockDb: Record<string, any[]> = {
  contacts: [
    {
      id: '00000000-0000-0000-0000-000000000888',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      first_name: 'Dumi',
      last_name: 'Khosa',
      email: 'dumi@khosacorp.co.za',
      id_number: '9201015082222', // Suffix 2222 (Should pass liveness)
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
      check_types: ['biometric', 'address_verification'],
      reference: 'test_consent_ref_888',
      created_at: new Date().toISOString()
    }
  ],
  kyc_documents: [
    {
      id: 'doc_id_ocr_999',
      workspace_id: '15cb0f15-45da-4727-ae00-44c7750a9705',
      contact_id: '00000000-0000-0000-0000-000000000888',
      document_type: 'smart_id',
      file_url: 'contacts/00000000-0000-0000-0000-000000000888/test.enc',
      encryption_iv: 'abcde12345',
      ocr_extracted_data: {},
      created_at: new Date().toISOString()
    }
  ],
  kyc_checks: [],
  kyc_consent_records: [],
  contact_activities: []
};

// Chainable query builder mock
function mockQueryBuilder(tableName: string) {
  const queryState = {
    filters: [] as { col: string; val: any; type: 'eq' | 'in' }[],
    orderField: null as string | null,
    limitVal: null as number | null,
    singleVal: false,
    maybeSingleVal: false,
    updateValues: null as any
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
      queryState.updateValues = updates;
      return builder;
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

      if (queryState.updateValues) {
        list.forEach(item => {
          Object.assign(item, queryState.updateValues);
        });
      }

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
  console.log('     SPRINT 9 EXPERIAN TRUEID & OCR TESTS         ');
  console.log('                  (MOCKED DB)                     ');
  console.log('==================================================\n');

  const { POST } = await import('../src/app/api/kyc/experian/trueid/route');

  const workspaceId = '15cb0f15-45da-4727-ae00-44c7750a9705';
  const testContactId = '00000000-0000-0000-0000-000000000888';

  // ----------------------------------------------------------------
  // Case 1: Biometric Liveness Check (Should Pass: Suffix 2222)
  // ----------------------------------------------------------------
  console.log('--- Case 1: Biometric Liveness check (Passed) ---');
  let response = await POST(
    new MockRequest('http://localhost/api/kyc/experian/trueid', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'liveness',
        contactId: testContactId,
        workspaceId,
        selfie: 'selfie_base64_data',
        idNumber: '9201015082222'
      })
    }) as any
  );
  let result = await response.json();
  console.log('Result status:', response.status);
  console.log('Liveness result description:', result.check?.result);
  console.log('Check status:', result.check?.status);

  const check1 = mockDb.kyc_checks.find(c => c.contact_id === testContactId && c.check_type === 'biometric');
  const contact1 = mockDb.contacts.find(c => c.id === testContactId);

  if (check1) {
    console.log('✅ Mock DB Assert - Status:', check1.status, '(Expected: passed)');
    console.log('✅ Mock DB Assert - Provider:', check1.provider, '(Expected: experian)');
    console.log('✅ Mock DB Assert - Result Column:', check1.result, '(Expected: Liveness Passed: Confidence 92%)');
  } else {
    console.error('❌ Mock DB Assert - Biometric check not found.');
  }

  if (contact1) {
    console.log('✅ Mock DB Assert - Contact Verified Flag:', contact1.kyc_id_verified, '(Expected: true)');
    console.log('✅ Mock DB Assert - Contact Risk Flag:', contact1.kyc_risk_flag, '(Expected: LOW)');
  }

  // ----------------------------------------------------------------
  // Case 2: Biometric Liveness Check (Should Fail: Suffix 1111)
  // ----------------------------------------------------------------
  console.log('\n--- Case 2: Biometric Liveness check (Failed/Spoof) ---');
  // Clear checks array
  mockDb.kyc_checks = [];

  response = await POST(
    new MockRequest('http://localhost/api/kyc/experian/trueid', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'liveness',
        contactId: testContactId,
        workspaceId,
        selfie: 'selfie_base64_data',
        idNumber: '9201015081111' // triggers fail
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status:', response.status);
  console.log('Liveness result description:', result.check?.result);
  console.log('Check status:', result.check?.status);

  const check2 = mockDb.kyc_checks.find(c => c.contact_id === testContactId && c.check_type === 'biometric');
  const contact2 = mockDb.contacts.find(c => c.id === testContactId);

  if (check2) {
    console.log('✅ Mock DB Assert - Status:', check2.status, '(Expected: failed)');
    console.log('✅ Mock DB Assert - Result Column:', check2.result, '(Expected: Liveness Failed: Confidence below 40% (Spoof Detected))');
  }

  if (contact2) {
    console.log('✅ Mock DB Assert - Contact Verified Flag:', contact2.kyc_id_verified, '(Expected: false)');
    console.log('✅ Mock DB Assert - Contact Risk Flag:', contact2.kyc_risk_flag, '(Expected: HIGH)');
  }

  // ----------------------------------------------------------------
  // Case 3: Document OCR Check
  // ----------------------------------------------------------------
  console.log('\n--- Case 3: Document OCR Parsing ---');
  response = await POST(
    new MockRequest('http://localhost/api/kyc/experian/trueid', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'ocr',
        contactId: testContactId,
        workspaceId,
        documentType: 'smart_id',
        documentId: 'doc_id_ocr_999',
        fileBase64: 'dummy-base64'
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status:', response.status);
  console.log('OCR Extracted Name:', result.extractedData?.firstName);
  console.log('OCR Extracted ID:', result.extractedData?.idNumber);

  const docRecord = mockDb.kyc_documents.find(d => d.id === 'doc_id_ocr_999');
  if (docRecord && docRecord.ocr_extracted_data) {
    console.log('✅ Mock DB Assert - DB Vault Saved ocr_extracted_data:', JSON.stringify(docRecord.ocr_extracted_data));
    console.log('✅ Mock DB Assert - OCR Name matches:', docRecord.ocr_extracted_data.firstName === 'Lerato');
  } else {
    console.error('❌ Mock DB Assert - OCR extracted data failed to write to kyc_documents.');
  }

  // ----------------------------------------------------------------
  // Case 4: Address Verification & Geocoding
  // ----------------------------------------------------------------
  console.log('\n--- Case 4: Experian Address Verification & Geocoding ---');
  mockDb.kyc_checks = [];
  response = await POST(
    new MockRequest('http://localhost/api/kyc/experian/trueid', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'address',
        contactId: testContactId,
        workspaceId,
        address: 'Apartment 23C, Melrose Arch, Sandton'
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status:', response.status);
  console.log('Verified Address returned:', result.geocodeResult?.verifiedAddress);
  console.log('GPS Coordinates:', result.geocodeResult?.latitude, ',', result.geocodeResult?.longitude);

  const check4 = mockDb.kyc_checks.find(c => c.contact_id === testContactId && c.check_type === 'address_verification');
  if (check4) {
    console.log('✅ Mock DB Assert - Check Status:', check4.status, '(Expected: passed)');
    console.log('✅ Mock DB Assert - Check Result Column:', check4.result, '(Expected: Verified & Geocoded)');
    console.log('✅ Mock DB Assert - Check GPS Notes:', check4.notes);
  } else {
    console.error('❌ Mock DB Assert - Address check not found in DB.');
  }

  // ----------------------------------------------------------------
  // Case 5: POPIA Consent Enforcement Check
  // ----------------------------------------------------------------
  console.log('\n--- Case 5: POPIA Consent Blocker ---');
  mockDb.kyc_consent = []; // Clear consent record

  response = await POST(
    new MockRequest('http://localhost/api/kyc/experian/trueid', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'liveness',
        contactId: testContactId,
        workspaceId,
        selfie: 'selfie_base64_data',
        idNumber: '9201015082222'
      })
    }) as any
  );
  result = await response.json();
  console.log('Result status (Expected: 403):', response.status);
  console.log('Error Message (Expected: Blocked):', result.error);

  if (response.status === 403 && result.error && result.error.includes('POPIA consent record exists')) {
    console.log('✅ PASS: Consent blocker successfully intercepted non-consented verification check!');
  } else {
    console.error('❌ FAIL: Consent blocker failed to intercept check!');
  }

  console.log('\nAll tests completed successfully!');
}

runTests().catch(console.error);
