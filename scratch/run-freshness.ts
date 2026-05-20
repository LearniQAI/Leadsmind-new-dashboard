import { runFreshnessCheck } from '../workers/screenshot-freshness';

async function main() {
  const result = await runFreshnessCheck();
  console.log('Result:', result);
}

main();
