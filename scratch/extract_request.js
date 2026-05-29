const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\2a9df3f5-9348-417f-bb89-6a545e498617\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  
  // Let's find the line with step_index: 409 or the user request
  for (let i = lines.length - 1; i >= 0; i--) {
    const obj = JSON.parse(lines[i]);
    if (obj.source === 'USER_EXPLICIT' && obj.type === 'USER_INPUT') {
      const userReq = obj.content;
      fs.writeFileSync('scratch/user_request.html', userReq);
      console.log('Successfully wrote user request to scratch/user_request.html (length:', userReq.length, ')');
      break;
    }
  }
} catch (err) {
  console.error('Failed to extract request:', err);
}
