const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\e9b154cc-d7c5-41c5-8eba-b1dad4389e60\\.system_generated\\logs\\transcript.jsonl';

async function scan() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Scanning log for apply_sprint6_migrations.ts...");

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    try {
      const entry = JSON.parse(line);
      const contentStr = entry.content || '';
      const toolCalls = entry.tool_calls || [];
      const toolCallStr = JSON.stringify(toolCalls);

      if (
        contentStr.includes('apply_sprint6_migrations') ||
        toolCallStr.includes('apply_sprint6_migrations')
      ) {
        console.log(`[Line ${lineCount}] Step: ${entry.step_index}, Source: ${entry.source}, Type: ${entry.type}`);
        if (contentStr) {
          console.log(`  Content snippet: ${contentStr.substring(0, 300).replace(/\n/g, ' ')}...`);
        }
        if (toolCalls.length > 0) {
          console.log(`  Tool Calls:`, toolCallStr.substring(0, 300));
        }
        console.log('--------------------------------------------------');
      }
    } catch (e) {
    }
  }
}

scan().catch(console.error);
