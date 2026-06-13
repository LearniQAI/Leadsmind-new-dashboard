const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function searchTask() {
  const logPath = path.resolve('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\3c627823-d14f-4676-81ea-cf213d7ead5b\\.system_generated\\logs\\transcript.jsonl');
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching for task-1783 in transcript...');
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('task-1783')) {
      console.log(`Line ${lineNum}: ${line.substring(0, 1000)}`);
    }
  }
}

searchTask().catch(console.error);
