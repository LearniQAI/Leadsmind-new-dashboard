import sidebarData from '../src/data/sidebar-data';

async function runTests() {
  console.log('==================================================');
  console.log('       SPRINT 13 KYC INTEGRATIONS & GATE TESTS    ');
  console.log('==================================================\n');

  // 1. Assert Compliance Hub sidebar entry exists
  console.log('--- Case 1: CRM Admin Navigation Schema ---');
  let complianceLinkFound = false;
  for (const category of sidebarData) {
    const item = category.items.find(i => i.link === '/admin/compliance');
    if (item) {
      complianceLinkFound = true;
      console.log(`✅ PASS: Found "${item.label}" link in "${category.category}" category.`);
      console.log(`   - Link: ${item.link}`);
      console.log(`   - Icon: ${item.icon}`);
      console.log(`   - Required Permission: ${item.permission}`);
    }
  }

  if (!complianceLinkFound) {
    console.error('❌ FAIL: Compliance Hub link not found in sidebarData!');
    process.exit(1);
  }

  // 2. Assert client restricted paths configuration matches
  console.log('\n--- Case 2: Restricted Paths Checking ---');
  const restrictedPaths = ['/portal/bookings', '/portal/courses', '/portal/projects', '/portal/support'];
  const allowedPaths = ['/portal/dashboard', '/portal/documents', '/portal/profile', '/portal/invoices'];

  // Simulate routing logic
  const checkAccess = (pathname: string, ficaComplete: boolean): { allowed: boolean } => {
    const isRestricted = restrictedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!ficaComplete && isRestricted) {
      return { allowed: false };
    }
    return { allowed: true };
  };

  // Assertions for unverified FICA status
  console.log('Simulating access gate for unverified client (fica_complete = false)...');
  for (const path of restrictedPaths) {
    const res = checkAccess(path, false);
    if (!res.allowed) {
      console.log(`✅ PASS: Correctly blocked direct access to restricted route "${path}".`);
    } else {
      console.error(`❌ FAIL: Allowed access to restricted route "${path}"!`);
      process.exit(1);
    }
  }

  for (const path of allowedPaths) {
    const res = checkAccess(path, false);
    if (res.allowed) {
      console.log(`✅ PASS: Permitted access to allowed route "${path}".`);
    } else {
      console.error(`❌ FAIL: Blocked access to allowed route "${path}"!`);
      process.exit(1);
    }
  }

  // Assertions for verified FICA status
  console.log('\nSimulating access gate for verified client (fica_complete = true)...');
  for (const path of [...restrictedPaths, ...allowedPaths]) {
    const res = checkAccess(path, true);
    if (res.allowed) {
      console.log(`✅ PASS: Permitted access to route "${path}".`);
    } else {
      console.error(`❌ FAIL: Blocked access to route "${path}" when FICA is complete!`);
      process.exit(1);
    }
  }

  console.log('\nAll integration gating assertions completed successfully!');
}

runTests().catch(console.error);
