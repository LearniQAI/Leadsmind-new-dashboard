import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  
  const sdkCode = `
(function() {
  var lm = window.lm || function() {
    (lm.q = lm.q || []).push(arguments);
  };
  window.lm = lm;

  var processInit = function(config) {
    var apiKey = config.apiKey;
    console.log('LeadsMind SDK Initialized');
    
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.getAttribute('data-lm-captured')) return;
      
      var formData = new FormData(form);
      var data = {};
      formData.forEach(function(value, key) {
        data[key] = value;
      });

      var lead = {
        email: data.email || data.user_email || data.contact_email,
        first_name: data.first_name || data.name || data.firstName,
        last_name: data.last_name || data.lastName,
        phone: data.phone || data.telephone,
        source: window.location.hostname,
        metadata: {
          url: window.location.href,
          form_id: form.id || form.name || 'unnamed_form'
        }
      };

      if (lead.email) {
        fetch('${appUrl}/api/v1/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(lead)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { 
          console.log('Lead captured by LeadsMind:', data);
          form.setAttribute('data-lm-captured', 'true');
        })
        .catch(function(err) { console.error('LeadsMind Capture Error:', err); });
      }
    });
  };

  // Execute queued commands
  if (lm.q) {
    var initialQ = lm.q;
    lm.q = []; // Clear queue
    initialQ.forEach(function(args) {
      if (args[0] === 'init') {
        processInit(args[1]);
      }
    });
  }
  
  // Override lm to process new commands immediately
  window.lm = function(cmd, arg) {
    if (cmd === 'init') processInit(arg);
  };
})();
`;

  return new NextResponse(sdkCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
