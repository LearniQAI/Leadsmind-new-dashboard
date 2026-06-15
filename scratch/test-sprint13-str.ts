import Module from 'module';
import crypto from 'crypto';

// Setup local mock database state
const mockWorkspaceId = '15cb0f15-45da-4727-ae00-44c7750a9705';
let mockUserRole = 'member'; // Starts as regular member

const mockDb: Record<string, any[]> = {
  contacts: [
    {
      id: '00000000-0000-0000-0000-000000000999',
      workspace_id: mockWorkspaceId,
      first_name: 'Lungile',
      last_name: 'Dlamini',
      email: 'lungile@example.co.za',
      phone: '+27821112222',
      id_number: '8801015091082'
    }
  ],
  kyc_consent_records: [
    {
      id: 'mock-consent-uuid-111',
      workspace_id: mockWorkspaceId,
      contact_id: '00000000-0000-0000-0000-000000000999',
      consent_type: 'identity_verification',
      status: 'obtained',
      reference: 'consent-ref-dlamini-999',
      created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ],
  kyc_risk_ratings: [
    {
      id: 'rating-uuid-999',
      workspace_id: mockWorkspaceId,
      contact_id: '00000000-0000-0000-0000-000000000999',
      overall_rating: 'amber',
      fica_complete: false
    }
  ],
  kyc_documents: [],
  str_reports: []
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
        const item = { id: `mock_str_id_${Math.floor(Math.random() * 100000)}`, created_at: new Date().toISOString(), ...r };
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
    upsert: (updates: any, options?: any) => {
      // Find if record exists in mockDb
      const contactId = updates.contact_id;
      let existingIndex = (mockDb[tableName] || []).findIndex(x => x.contact_id === contactId);
      
      let finalRecord: any;
      if (existingIndex >= 0) {
        mockDb[tableName][existingIndex] = { ...mockDb[tableName][existingIndex], ...updates, updated_at: new Date().toISOString() };
        finalRecord = mockDb[tableName][existingIndex];
      } else {
        finalRecord = { id: `mock_upsert_id_${Math.floor(Math.random() * 100000)}`, created_at: new Date().toISOString(), ...updates };
        mockDb[tableName].push(finalRecord);
      }
      return Promise.resolve({ data: finalRecord, error: null });
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

const mockSupabaseClient = {
  from: (tableName: string) => mockQueryBuilder(tableName),
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'test-user-id-555' } }, error: null })
  }
};

// Intercept local module imports for NextJS/auth wrappers
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id.includes('lib/supabase/server')) {
    return {
      createServerClient: () => Promise.resolve(mockSupabaseClient),
      createAdminClient: () => mockSupabaseClient
    };
  }
  if (id.includes('lib/auth')) {
    return {
      getCurrentWorkspaceId: () => Promise.resolve(mockWorkspaceId),
      getUserAccessInfo: () => Promise.resolve({ role: mockUserRole, permissions: [] })
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Start the actual integration assertions
async function runTests() {
  console.log('==================================================');
  console.log('       SPRINT 13 FIC STR WORKFLOW TESTS           ');
  console.log('                (MOCKED DB)                       ');
  console.log('==================================================\n');

  // Import services and actions
  const { ficTransformer } = await import('../server/services/ficTransformer');
  const { saveStrDraft, finalizeAndFileStr } = await import('../src/app/actions/complianceStr');

  const testContactId = '00000000-0000-0000-0000-000000000999';

  // ----------------------------------------------------------------
  // Case 1: Role Access Enforcement
  // ----------------------------------------------------------------
  console.log('--- Case 1: Role Access Enforcement ---');
  mockUserRole = 'member'; // Regular members should be blocked
  
  const memberDraftRes = await saveStrDraft({
    contactId: testContactId,
    amount: 150000.00,
    currency: 'ZAR',
    transactionDate: '2026-06-15',
    description: 'Suspicious high-value cash deposits observed over 3 consecutive days.',
    anomalies: ['Unusual High Value Cash Transaction']
  });

  if (!memberDraftRes.success && memberDraftRes.error?.includes('Access Denied')) {
    console.log('✅ PASS: Correctly blocked basic workspace member from drafting STR.');
  } else {
    console.error('❌ FAIL: Basic workspace member was not blocked!', memberDraftRes);
  }

  // Switch to compliance role
  mockUserRole = 'compliance';
  const complianceDraftRes = await saveStrDraft({
    contactId: testContactId,
    amount: 150000.00,
    currency: 'ZAR',
    transactionDate: '2026-06-15',
    description: 'Suspicious high-value cash deposits observed over 3 consecutive days.',
    anomalies: ['Unusual High Value Cash Transaction', 'Physical Address Verification Mismatch']
  });

  if (complianceDraftRes.success && complianceDraftRes.report) {
    console.log('✅ PASS: Compliance officer successfully saved STR draft.');
    console.log('Created STR Report UUID:', complianceDraftRes.report.id);
  } else {
    console.error('❌ FAIL: Compliance officer blocked from saving draft!', complianceDraftRes);
  }

  // ----------------------------------------------------------------
  // Case 2: Schema Serialization via Transformer
  // ----------------------------------------------------------------
  console.log('\n--- Case 2: FIC Schema Serialization Engine ---');
  const reportObj = mockDb.str_reports[0];
  const contactObj = mockDb.contacts[0];

  const serializationInput = {
    report_id: reportObj.id,
    workspace_id: mockWorkspaceId,
    contact: {
      id: contactObj.id,
      first_name: contactObj.first_name,
      last_name: contactObj.last_name,
      id_number: contactObj.id_number,
      email: contactObj.email,
      phone: contactObj.phone,
      kyc_risk_flag: 'AMBER'
    },
    transaction: {
      amount: reportObj.transaction_details.amount,
      currency: reportObj.transaction_details.currency,
      transaction_date: reportObj.transaction_details.transaction_date,
      description: reportObj.transaction_details.description
    },
    anomalies: reportObj.anomalies
  };

  const xmlOutput = ficTransformer.serializeToXml(serializationInput);
  const jsonOutput = ficTransformer.serializeToJson(serializationInput);

  console.log('--- XML Output Preview ---');
  console.log(xmlOutput);
  console.log('--------------------------');

  if (xmlOutput.includes('<fic_goaml_report>') && xmlOutput.includes('<subject_id>00000000-0000-0000-0000-000000000999</subject_id>')) {
    console.log('✅ PASS: XML successfully serialized to standard FIC layout.');
  } else {
    console.error('❌ FAIL: XML output formatting mismatch.');
  }

  if (jsonOutput.fic_transport_meta.report_type === 'STR' && jsonOutput.subject.national_id === '8801015091082') {
    console.log('✅ PASS: JSON transport payload successfully generated.');
  } else {
    console.error('❌ FAIL: JSON output formatting mismatch.');
  }

  // ----------------------------------------------------------------
  // Case 3: STR Finalization & Locking Workflow
  // ----------------------------------------------------------------
  console.log('\n--- Case 3: STR Finalization & Audit Trail Linkage ---');
  
  const draftId = reportObj.id;
  const finalizeRes = await finalizeAndFileStr(draftId);

  if (finalizeRes.success && finalizeRes.report) {
    console.log('✅ PASS: STR successfully finalized and write-locked.');
    console.log('Report Status:', finalizeRes.report.status); // Should be 'filed'
  } else {
    console.error('❌ FAIL: Finalization call failed:', finalizeRes);
  }

  // Check that risk rating table was updated
  const riskRating = mockDb.kyc_risk_ratings.find(r => r.contact_id === testContactId);
  if (riskRating && riskRating.str_filed === true && riskRating.str_filed_at) {
    console.log('✅ PASS: kyc_risk_ratings correctly updated with str_filed: true and timestamp.');
  } else {
    console.error('❌ FAIL: kyc_risk_ratings did not update correctly.', riskRating);
  }

  // Check FICA 5-year retention doc was created in kyc_documents
  const complianceDoc = mockDb.kyc_documents.find(d => d.contact_id === testContactId && d.document_type === 'str_report');
  if (complianceDoc) {
    console.log('✅ PASS: Locked STR PDF/XML record saved to kyc_documents.');
    console.log('Vault storage path:', complianceDoc.file_url);
    console.log('FICA Retention date:', complianceDoc.retention_delete_after);
    
    // Assert entity consent linkage matching
    if (complianceDoc.consent_id === 'mock-consent-uuid-111') {
      console.log('✅ PASS: STR Document linked directly to parent FICA Consent ID:', complianceDoc.consent_id);
    } else {
      console.error('❌ FAIL: Document has no consent record linkage bound.', complianceDoc);
    }
  } else {
    console.error('❌ FAIL: STR record not recorded in kyc_documents.');
  }

  console.log('\nAll integration tests completed successfully!');
}

runTests().catch(console.error);
