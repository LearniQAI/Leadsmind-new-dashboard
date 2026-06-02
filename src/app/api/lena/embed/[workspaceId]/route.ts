import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { workspaceId } = params;
    if (!workspaceId) {
      return new NextResponse('Missing workspaceId', { status: 400 });
    }

    // Fetch config
    const { data: config } = await supabase
      .from('lena_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    const botName = config?.bot_name || 'LENA';
    const welcomeMsg = config?.welcome_message || 'Hi there! I am LENA. How can I help you today?';
    const primaryColor = config?.primary_color || '#6366F1';
    const position = config?.position || 'right';
    const quickReplies = config?.quick_replies || [];

    const jsCode = `
(function() {
  const scriptTag = document.currentScript;
  const scriptSrc = scriptTag ? scriptTag.src : '';
  let apiBase = '';
  try {
    if (scriptSrc) {
      apiBase = new URL(scriptSrc).origin;
    }
  } catch (e) {
    console.error('LENA: failed to parse script origin:', e);
  }
  if (!apiBase) {
    apiBase = window.location.origin;
  }

  // Styles
  const style = document.createElement('style');
  style.innerHTML = \`
    #lena-widget-bubble {
      position: fixed;
      bottom: 20px;
      ${position}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${primaryColor};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: transform 0.2s ease;
    }
    #lena-widget-bubble:hover {
      transform: scale(1.05);
    }
    #lena-widget-container {
      position: fixed;
      bottom: 90px;
      ${position}: 20px;
      width: 360px;
      height: 500px;
      background: #080f28;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      display: none;
      flex-direction: column;
      z-index: 999999;
      font-family: 'DM Sans', sans-serif;
      overflow: hidden;
      color: #eef2ff;
    }
    #lena-widget-header {
      background: #0c1535;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    #lena-widget-header-title {
      font-weight: bold;
      font-size: 15px;
    }
    #lena-widget-header-status {
      font-size: 11px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #lena-widget-header-status::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
    }
    #lena-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lena-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
      word-break: break-word;
    }
    .lena-msg-visitor {
      align-self: flex-end;
      background: rgba(37,99,235,0.14);
      border: 1px solid rgba(37,99,235,0.2);
      color: #eef2ff;
    }
    .lena-msg-bot {
      align-self: flex-start;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.07);
      color: #eef2ff;
    }
    #lena-widget-quickreplies {
      padding: 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      border-top: 1px solid rgba(255,255,255,0.05);
      background: #080f28;
    }
    .lena-qr-chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      color: #94a3c8;
      transition: all 0.15s ease;
    }
    .lena-qr-chip:hover {
      background: ${primaryColor};
      color: white;
    }
    #lena-widget-input-container {
      padding: 12px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      gap: 8px;
      background: #080f28;
    }
    #lena-widget-input {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      padding: 8px 12px;
      color: #eef2ff;
      font-size: 13px;
      outline: none;
    }
    #lena-widget-input:focus {
      border-color: ${primaryColor};
    }
    #lena-widget-send {
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  \`;
  document.head.appendChild(style);

  // Fonts
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // Widget elements
  const bubble = document.createElement('div');
  bubble.id = 'lena-widget-bubble';
  bubble.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  document.body.appendChild(bubble);

  const container = document.createElement('div');
  container.id = 'lena-widget-container';
  container.innerHTML = \`
    <div id="lena-widget-header">
      <div>
        <div id="lena-widget-header-title">${botName} AI</div>
        <div id="lena-widget-header-status">Online</div>
      </div>
      <button style="background:none;border:none;color:#94a3c8;cursor:pointer;font-size:16px;" id="lena-widget-close">✕</button>
    </div>
    <div id="lena-widget-messages"></div>
    <div id="lena-widget-quickreplies"></div>
    <div id="lena-widget-input-container">
      <input type="text" id="lena-widget-input" placeholder="Type a message..." />
      <button id="lena-widget-send">Send</button>
    </div>
  \`;
  document.body.appendChild(container);

  // State
  let conversationId = localStorage.getItem('lena_conversation_id_' + '${workspaceId}');
  let visitorId = localStorage.getItem('lena_visitor_id_' + '${workspaceId}');
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('lena_visitor_id_' + '${workspaceId}', visitorId);
  }

  // Toggle
  bubble.onclick = () => {
    const isVisible = container.style.display === 'flex';
    container.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      document.getElementById('lena-widget-input').focus();
      scrollDown();
    }
  };

  document.getElementById('lena-widget-close').onclick = () => {
    container.style.display = 'none';
  };

  const messagesDiv = document.getElementById('lena-widget-messages');
  const quickRepliesDiv = document.getElementById('lena-widget-quickreplies');

  function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = 'lena-msg lena-msg-' + sender;
    msg.innerText = text;
    messagesDiv.appendChild(msg);
    scrollDown();
  }

  function scrollDown() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Load configuration details
  const qrs = ${JSON.stringify(quickReplies)};
  if (qrs && qrs.length > 0) {
    qrs.forEach(qr => {
      const chip = document.createElement('div');
      chip.className = 'lena-qr-chip';
      chip.innerText = qr;
      chip.onclick = () => {
        sendUserMessage(qr);
      };
      quickRepliesDiv.appendChild(chip);
    });
  } else {
    quickRepliesDiv.style.display = 'none';
  }

  // Welcome message
  appendMessage('bot', \`${welcomeMsg}\`);

  // Load existing messages if conversationId exists
  if (conversationId) {
    fetch(apiBase + '/api/lena/messages?conversationId=' + conversationId)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          messagesDiv.innerHTML = '';
          data.messages.forEach(m => {
            appendMessage(m.sender_type === 'visitor' ? 'visitor' : 'bot', m.content);
          });
        }
      });
  }

  function sendUserMessage(text) {
    if (!text.trim()) return;
    appendMessage('visitor', text);

    fetch(apiBase + '/api/lena/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: '${workspaceId}',
        conversationId: conversationId,
        visitorMessage: text,
        visitorId: visitorId
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.conversationId) {
        conversationId = data.conversationId;
        localStorage.setItem('lena_conversation_id_' + '${workspaceId}', conversationId);
      }
      appendMessage('bot', data.reply);
    });
  }

  document.getElementById('lena-widget-send').onclick = () => {
    const input = document.getElementById('lena-widget-input');
    const val = input.value;
    input.value = '';
    sendUserMessage(val);
  };

  document.getElementById('lena-widget-input').onkeypress = (e) => {
    if (e.key === 'Enter') {
      const input = document.getElementById('lena-widget-input');
      const val = input.value;
      input.value = '';
      sendUserMessage(val);
    }
  };

  // Poll for messages every 5 seconds
  setInterval(() => {
    if (conversationId) {
      fetch(apiBase + '/api/lena/messages?conversationId=' + conversationId)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            const currentCount = messagesDiv.getElementsByClassName('lena-msg').length;
            if (data.messages.length > currentCount) {
              messagesDiv.innerHTML = '';
              data.messages.forEach(m => {
                appendMessage(m.sender_type === 'visitor' ? 'visitor' : 'bot', m.content);
              });
            }
          }
        });
    }
  }, 5000);

})();
    `;

    return new NextResponse(jsCode, {
      headers: { 'Content-Type': 'application/javascript' }
    });
  } catch (err: any) {
    return new NextResponse(`console.error("LENA Widget: Error loading embed script: ${err.message}");`, {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}
