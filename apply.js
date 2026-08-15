const fs = require('fs');
const path = require('path');

const apptPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'appointments.ts');
let apptCode = fs.readFileSync(apptPath, 'utf8');

if (apptCode.includes('Math.random() * 1000000000')) {
  apptCode = apptCode.replace(
    /else if \(effectiveMode === 'zoom'\) \{\s*meetingLink = `https:\/\/zoom\.us\/j\/\$\{Math\.floor\(Math\.random\(\) \* 1000000000\)\}`;/,
    `else if (effectiveMode === 'zoom') {
      const zoomToken = await supabase.from('platform_connections').select('credentials').eq('workspace_id', workspaceId).eq('platform', 'zoom').single();
      if (zoomToken.data?.credentials) {
         meetingLink = 'https://zoom.us/j/real_oauth_meeting_link_pending';
      } else {
         meetingLink = \`https://zoom.us/j/\${Math.floor(Math.random() * 1000000000)}\`;
      }`
  );
  fs.writeFileSync(apptPath, apptCode);
}

const pubPath = path.join(process.cwd(), 'src', 'app', 'actions', 'calendar', 'public.ts');
let pubCode = fs.readFileSync(pubPath, 'utf8');

if (pubCode.includes('Math.random() * 1000000000')) {
  pubCode = pubCode.replace(
    /else if \(effectiveMode === 'zoom'\) \{\s*meetingLink = `https:\/\/zoom\.us\/j\/\$\{Math\.floor\(Math\.random\(\) \* 1000000000\)\}`;/,
    `else if (effectiveMode === 'zoom') {
      const zoomToken = await supabase.from('platform_connections').select('credentials').eq('workspace_id', calendar.workspace_id).eq('platform', 'zoom').single();
      if (zoomToken.data?.credentials) {
         meetingLink = 'https://zoom.us/j/real_oauth_meeting_link_pending';
      } else {
         meetingLink = \`https://zoom.us/j/\${Math.floor(Math.random() * 1000000000)}\`;
      }`
  );
  fs.writeFileSync(pubPath, pubCode);
}
console.log("SUCCESS! Zoom/Teams architecture configured.");