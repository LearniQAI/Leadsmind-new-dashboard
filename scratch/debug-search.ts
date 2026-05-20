(global as any).WebSocket = class {};
import { searchHelpArticles } from '../src/app/actions/help';

async function main() {
  const query = "recipe for homemade chocolate fudge brownies";
  console.log(`Searching query: "${query}"`);
  const res = await searchHelpArticles(query);
  console.log('Results:', JSON.stringify(res, null, 2));
}

main();
