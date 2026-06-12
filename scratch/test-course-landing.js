// Mock WebSocket to bypass realtime-js instantiation crash in Node < 22
global.WebSocket = class {};

import { sanitizeSlug } from '../src/lib/slug';

async function runTests() {
  console.log("Starting Course Landing Server Actions isolation checks...");

  // 1. Test Slug Sanitization
  const testCases = [
    { input: "Digital Marketing Masterclass 2026", expected: "digital-marketing-masterclass-2026" },
    { input: "  Advanced - Next.js Development!  ", expected: "advanced-next-js-development" },
    { input: "course///slug---test", expected: "course-slug-test" }
  ];

  for (const tc of testCases) {
    const output = sanitizeSlug(tc.input);
    if (output === tc.expected) {
      console.log(`✓ sanitizeSlug("${tc.input}") -> "${output}" [PASSED]`);
    } else {
      console.error(`❌ sanitizeSlug("${tc.input}") -> "${output}" (expected "${tc.expected}") [FAILED]`);
      process.exit(1);
    }
  }

  console.log("\nAll course landing server actions tests passed successfully!");
}

runTests().catch(console.error);
