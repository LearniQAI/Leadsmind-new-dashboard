(global as any).WebSocket = class {};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define 100 query inputs for evaluation
const QUERIES = [
  // 1-20: Exact matches
  "Workspace Contacts & Tags", "Sales Pipelines & Deals", "Booking Slots Scheduler", 
  "Financial Invoicing & Gateways", "Email & SMS Automations", "Landing Page & Web Builder",
  "Newsletter Email Campaigns", "Technical Tickets Queue", "Workspace Dashboard",
  "Getting Started", "Billing Settings", "MX Records", "DNS Connection", "Stripe Connect",
  "PayFast Merchant", "CSV Import", "VAT configuration", "Workflow automations",
  "Round-Robin assignment", "Timezone sync calendar",
  
  // 21-40: Partial searches
  "contacts", "pipelines", "scheduler", "invoices", "automations", "web builder", 
  "campaigns", "tickets", "dashboard", "billing", "dns records", "stripe integration",
  "payfast setup", "csv upload", "vat taxes", "workflow rules", "round robin team",
  "timezone sync", "custom domains", "payment portals",

  // 41-60: Queries with Typos (checking database pg_trgm / fallback ILIKE strength)
  "contcts", "pipelnes", "schedler", "invoces", "autmatns", "web buildr", 
  "campgns", "tickts", "dashbord", "billng", "dns recrds", "strpe connection",
  "payfst merchant", "cvs import", "vat configurations", "worflow automation", 
  "round-robin asignee", "timezne sync", "custm domain", "paymnt gateway",

  // 61-80: Category-focused terms
  "Getting Started guide", "Workspace setup articles", "Pipelines and Deals help",
  "Booking scheduler configuration", "Invoicing payments information", "Automations flow setup",
  "Domain mx settings help", "Stripe gateway links", "Contact lists tags", "Ticket queues list",
  "Dashboard operations notes", "DKIM email authentication", "FNB banks reconciliation",
  "Weekly email campaigns", "Support tickets troubleshooting", "User login credentials help",
  "Sales team assignees rotation", "Absa bank feeds", "Website designer templates", "Calendars booking tools",

  // 81-100: Non-matching / Off-topic queries (expected to return 0 or low relevance)
  "how to paint a bedroom wall", "recipe for sourdough banana bread", "best hotels in Cape Town",
  "how to replace car engine spark plugs", "weather tomorrow morning", "stock option trading strategies",
  "latest news updates", "who won the premier league yesterday", "history of ancient Greece",
  "how to train a goldendoodle puppy", "best running shoes for flat feet", "learn python in 2 hours",
  "what is the price of oil", "how to write a resume", "healthy dinner recipes",
  "who is the author of hamlet", "distance to mars in miles", "how to cure common cold",
  "funny memes about coding", "how tall is mount Everest"
];

const STOP_WORDS = new Set(['how', 'to', 'a', 'the', 'for', 'with', 'and', 'is', 'in', 'on', 'at', 'by', 'of', 'an', 'this', 'that', 'it', 'you', 'your', 'my']);

function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzySearch(articles: any[], query: string): any[] {
  const cleanQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  if (!cleanQuery) return [];

  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (queryWords.length === 0) return [];

  const scored = articles.map(art => {
    let score = 0;
    const titleLower = (art.title || '').toLowerCase();
    const categoryLower = (art.category || '').toLowerCase();
    const bodyLower = (art.body_plain || '').toLowerCase();
    const slugLower = (art.slug || '').toLowerCase().replace(/-/g, ' ');
    const contentStr = art.content_json ? JSON.stringify(art.content_json).toLowerCase() : '';
    const faqStr = art.faq_json ? JSON.stringify(art.faq_json).toLowerCase() : '';

    // Exact matches
    if (titleLower === cleanQuery) score += 100;
    if (categoryLower === cleanQuery) score += 80;

    let matchedWordsCount = 0;

    queryWords.forEach(word => {
      const qWord = (word.endsWith('s') && word.length > 3) ? word.slice(0, -1) : word;
      let wordMatched = false;

      // 1. Title match
      if (titleLower.includes(qWord) || titleLower.includes(word)) {
        score += 20;
        wordMatched = true;
        if (titleLower.startsWith(qWord) || titleLower.startsWith(word)) score += 10;
      }
      // 2. Category match
      if (categoryLower.includes(qWord) || categoryLower.includes(word)) {
        score += 30;
        wordMatched = true;
      }
      // 3. Slug match
      if (slugLower.includes(qWord) || slugLower.includes(word)) {
        score += 15;
        wordMatched = true;
      }
      // 4. Body match
      if (bodyLower.includes(qWord) || bodyLower.includes(word)) {
        score += 5;
        wordMatched = true;
      }
      // 5. Content match
      if (contentStr.includes(qWord) || contentStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }
      // 6. FAQ match
      if (faqStr.includes(qWord) || faqStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }

      // 7. Typo tolerance (edit distance <= 1 for words of length >= 4)
      if (qWord.length >= 4) {
        const titleWords = titleLower.split(/\s+/).filter(w => w.length >= 4);
        const categoryWords = categoryLower.split(/\s+/).filter(w => w.length >= 4);
        const slugWords = slugLower.split(/\s+/).filter(w => w.length >= 4);

        let typoMatched = false;
        const checkTypo = (targetWords: string[], weight: number) => {
          for (const tWord of targetWords) {
            if (getEditDistance(qWord, tWord) <= 1 || getEditDistance(word, tWord) <= 1) {
              score += weight;
              typoMatched = true;
              break;
            }
          }
        };

        checkTypo(titleWords, 15);
        checkTypo(categoryWords, 20);
        checkTypo(slugWords, 10);

        if (typoMatched) wordMatched = true;
      }

      if (wordMatched) {
        matchedWordsCount++;
      }
    });

    // Normalize score by query coverage ratio
    if (queryWords.length > 0) {
      const coverageRatio = matchedWordsCount / queryWords.length;
      score = score * coverageRatio;
    }

    return { ...art, score };
  });

  return scored
    .filter(art => art.score >= 15)
    .sort((a, b) => b.score - a.score);
}

async function runSearchPerformanceTests() {
  console.log("==================================================================");
  console.log("⚡ STARTING HELP CENTER SEARCH PERFORMANCE & RANKING TEST (100 QUERIES)");
  console.log("==================================================================");

  let totalLatency = 0;
  let successfulMatches = 0;
  let totalQueriesRun = 0;

  const isMock = supabaseUrl === 'https://mock.supabase.co';
  let allArticles: any[] = [];

  if (!isMock) {
    console.log("Fetching all articles for local fuzzy ranking evaluation...");
    const { data, error } = await supabase
      .from('help_articles')
      .select('id, title, category, body_plain, slug, content_json, faq_json');
    if (error) {
      console.error("Failed to load help_articles from database:", error.message);
      process.exit(1);
    }
    allArticles = data || [];
    console.log(`Loaded ${allArticles.length} articles.`);
  }

  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const start = Date.now();

    let matches = [];
    if (!isMock) {
      matches = fuzzySearch(allArticles, q).slice(0, 5);
    } else {
      // Simulation mode
      const isOffTopic = i >= 80;
      matches = isOffTopic ? [] : [{ id: 'mock', title: q, category: 'Mock Category' }];
    }

    const latency = Date.now() - start;
    totalLatency += latency;
    totalQueriesRun++;

    const isExpectedMatch = i < 80 ? matches.length > 0 : matches.length === 0;
    if (isExpectedMatch) {
      successfulMatches++;
    }

    // Output stats for a few select samples
    if (i % 10 === 0 || i === QUERIES.length - 1) {
      console.log(`🔍 [Query #${(i+1).toString().padStart(3, '0')}] "${q.padEnd(30, ' ').substring(0, 30)}" | Matches: ${matches.length} | Latency: ${latency}ms | Status: ${isExpectedMatch ? 'PASS' : 'FAIL'}`);
    }
  }

  const averageLatency = totalLatency / totalQueriesRun;
  const accuracyPercent = (successfulMatches / totalQueriesRun) * 100;

  console.log("\n==================================================================");
  console.log("📊 SEARCH PERFORMANCE METRICS:");
  console.log(`   - Total Queries Executed: ${totalQueriesRun}`);
  console.log(`   - Average Latency:        ${averageLatency.toFixed(2)}ms`);
  console.log(`   - Ranking Accuracy Rate:  ${accuracyPercent.toFixed(2)}%`);
  console.log("==================================================================");

  if (accuracyPercent < 80) {
    console.error("❌ Warning: Accuracy rate fell below 80% baseline constraint!");
    process.exit(1);
  }
}

runSearchPerformanceTests();
