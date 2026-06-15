import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock WebSocket to prevent Realtime client crash in node environments
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

import Module from 'module';

const realSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const realSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let useMock = false;

// Mock database state
const mockDb: Record<string, any[]> = {
  contacts: [],
  kyc_risk_ratings: [],
  beneficial_owners: [],
  contact_tasks: [],
  kyc_documents: []
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
    upsert: (record: any, options?: any) => {
      mockDb[tableName] = mockDb[tableName] || [];
      const conflictCol = options?.onConflict || 'id';
      const existingIdx = mockDb[tableName].findIndex(item => item[conflictCol] === record[conflictCol]);
      
      const item = { 
        id: existingIdx !== -1 ? mockDb[tableName][existingIdx].id : `mock_id_${Math.floor(Math.random() * 100000)}`,
        created_at: existingIdx !== -1 ? mockDb[tableName][existingIdx].created_at : new Date().toISOString(),
        ...record 
      };

      if (existingIdx !== -1) {
        mockDb[tableName][existingIdx] = item;
      } else {
        mockDb[tableName].push(item);
      }

      const upsertChain = {
        select: () => ({
          single: () => Promise.resolve({ data: item, error: null }),
          then: (resFn: any) => resFn({ data: [item], error: null })
        }),
        then: (resFn: any) => resFn({ data: item, error: null })
      };
      return upsertChain;
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

// Global require interception to bypass NextJS-specific auth/Supabase layers
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (useMock && id === '@supabase/supabase-js') {
    return {
      createClient: () => {
        return {
          from: (tableName: string) => mockQueryBuilder(tableName),
          rpc: (name: string, args: any) => Promise.resolve({ data: [], error: null })
        };
      }
    };
  }
  if (id.includes('lib/auth')) {
    return {
      getCurrentWorkspaceId: () => Promise.resolve('00000000-0000-0000-0000-000000000012'),
      requireAuth: () => Promise.resolve()
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Check remote connectivity first
async function initializeEnv() {
  const { createClient } = await import('@supabase/supabase-js');
  const tempClient = createClient(realSupabaseUrl, realSupabaseKey);
  const { error } = await tempClient.from('beneficial_owners').select('id').limit(1);
  
  if (error && (error.message.includes('public.beneficial_owners') || error.message.includes('relation "public.beneficial_owners" does not exist'))) {
    console.log('⚠️  Remote migration beneficial_owners is missing. Initializing Mock DB engine...');
    useMock = true;
  } else {
    console.log('✅ Remote beneficial_owners table is present. Running integration tests directly on DB...');
  }
}

async function run() {
  await initializeEnv();

  const { createClient } = await import('@supabase/supabase-js');
  const dbClient = createClient(realSupabaseUrl, realSupabaseKey);

  console.log('\n==================================================');
  console.log('    SPRINT 12: CIPC LOOKUP & B2B BENEFICIAL OWNERS ');
  console.log('==================================================\n');

  const workspaceId = '00000000-0000-0000-0000-000000000012';
  const parentCompanyId = '00000000-0000-0000-0000-000000000999';

  // Cleanup helper
  const cleanUp = async () => {
    if (useMock) {
      mockDb.contacts = [];
      mockDb.kyc_risk_ratings = [];
      mockDb.beneficial_owners = [];
      mockDb.contact_tasks = [];
      mockDb.kyc_documents = [];
    } else {
      await dbClient.from('beneficial_owners').delete().eq('contact_id', parentCompanyId);
      await dbClient.from('contact_tasks').delete().eq('workspace_id', workspaceId);
      await dbClient.from('kyc_documents').delete().eq('contact_id', parentCompanyId);
      await dbClient.from('kyc_risk_ratings').delete().eq('contact_id', parentCompanyId);
      await dbClient.from('contacts').delete().eq('workspace_id', workspaceId);
    }
  };

  const setupParentCompany = async () => {
    const parent = {
      id: parentCompanyId,
      workspace_id: workspaceId,
      first_name: 'Zafro Logistics',
      last_name: 'Corporate',
      email: 'hq@zafrologistics.co.za',
      tags: ['corporate-b2b']
    };

    if (useMock) {
      mockDb.contacts.push(parent);
    } else {
      await dbClient.from('contacts').insert(parent);
    }
  };

  // -------------------------------------------------------------
  // Test Case 1: Search CIPC corporate registry
  // -------------------------------------------------------------
  console.log('--- Test Case 1: CIPC Corporate Search ---');
  const { searchCIPC } = await import('../src/app/actions/cipcLookup');
  
  const searchRes = await searchCIPC('Zafro Logistics');
  console.log('Search success:', searchRes.success, '(Expected: true)');
  console.log('Matched records:', searchRes.data?.length, '(Expected: 1)');
  console.log('Company Name:', searchRes.data?.[0].companyName, '(Expected: Zafro Logistics (Pty) Ltd)');
  console.log('Directors count:', searchRes.data?.[0].directors.length, '(Expected: 2)');

  if (!searchRes.success || searchRes.data?.[0].companyName !== 'Zafro Logistics (Pty) Ltd') {
    throw new Error('Case 1 assertion failed!');
  }
  console.log('✅ Case 1 Passed.');

  // -------------------------------------------------------------
  // Test Case 2 & 3: Link CIPC directors and spawn nested tasks
  // -------------------------------------------------------------
  console.log('\n--- Test Case 2 & 3: Link CIPC & Spawning Sub-Tasks ---');
  await cleanUp();
  await setupParentCompany();
  const { linkCIPCDirectors, getBeneficialOwners } = await import('../src/app/actions/cipcLookup');

  const compData = searchRes.data?.[0];
  if (!compData) throw new Error('CIPC data missing for test');

  // Trigger CIPC directors link
  const linkRes = await linkCIPCDirectors(parentCompanyId, compData.companyName, compData.directors);
  console.log('Directors Link response:', linkRes.success, '(Expected: true)');

  if (!linkRes.success) {
    throw new Error('Failed to link CIPC directors: ' + linkRes.error);
  }

  // Verify mapped beneficial owners
  const verifyOwners = await getBeneficialOwners(parentCompanyId);
  console.log('Linked Owners in DB:', verifyOwners.data?.length, '(Expected: 2)');
  console.log('Requires EDD Status:', verifyOwners.requiresEdd, '(Expected: true)');

  if (verifyOwners.data?.length !== 2 || !verifyOwners.requiresEdd) {
    throw new Error('Case 2 Beneficial Owner Mapping assertions failed!');
  }
  console.log('✅ Case 2 Mappings Verified.');

  // Verify nested tasks spawned in DB
  let tasks: any[] = [];
  if (useMock) {
    tasks = mockDb.contact_tasks;
  } else {
    const { data } = await dbClient.from('contact_tasks').select('*');
    tasks = data || [];
  }

  console.log('Spawned KYC Tasks in DB:', tasks.length, '(Expected: 2)');
  console.log('Task 1 Title:', tasks[0]?.title, '(Expected to contain "[KYC Sub-Task]")');
  console.log('Task 2 Title:', tasks[1]?.title, '(Expected to contain "[KYC Sub-Task]")');

  if (tasks.length !== 2 || !tasks[0]?.title.includes('[KYC Sub-Task]')) {
    throw new Error('Case 3 Sub-task routing verification failed!');
  }
  console.log('✅ Case 3 Task Router Verified.');

  // -------------------------------------------------------------
  // Test Case 4: Uploading Beneficial Ownership Form
  // -------------------------------------------------------------
  console.log('\n--- Test Case 4: Beneficial Ownership Vault Form Upload ---');
  const { uploadBeneficialOwnershipForm } = await import('../src/app/actions/cipcLookup');

  const uploadRes = await uploadBeneficialOwnershipForm(parentCompanyId, 'zafro_declarations_final.pdf');
  console.log('Upload response:', uploadRes.success, '(Expected: true)');

  const updatedOwners = await getBeneficialOwners(parentCompanyId);
  console.log('Uploaded Form documents list count:', updatedOwners.documents?.length, '(Expected: 1)');
  console.log('Uploaded file URL:', updatedOwners.documents?.[0]?.file_url, '(Expected to contain "zafro_declarations_final.pdf")');

  if (updatedOwners.documents?.length !== 1 || !updatedOwners.documents?.[0]?.file_url.includes('zafro_declarations_final.pdf')) {
    throw new Error('Case 4 Document Vault assertions failed!');
  }
  console.log('✅ Case 4 Document Upload Verified.');

  // Final clean up
  await cleanUp();
  console.log('\n==================================================');
  console.log('    ALL B2B CIPC COMPLIANCE TESTS COMPLETED!      ');
  console.log('==================================================\n');
}

run().catch(err => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
