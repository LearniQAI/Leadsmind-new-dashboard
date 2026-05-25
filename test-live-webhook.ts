import { Webhook } from 'svix';

async function testLiveWebhook() {
  const secret = "whsec_4kkbdddIMrZKTrv/AXmNeJyAZIP45Xeo";
  const url = "https://www.leadsmind.io/api/webhooks/resend/inbound"; // Change to your live URL if different

  // Construct a dummy Resend payload
  const payload = {
    type: "email.received",
    created_at: new Date().toISOString(),
    data: {
      from: "test_agent@leadsmind.io",
      to: ["+15555555555@sms.leadsmind.io"], // Dummy phone number
      subject: "Test from AI",
      text: "This is a live test message from the AI agent.",
      html: "<p>This is a live test message from the AI agent.</p>",
      headers: {
        "Message-ID": "<mock-id-12345@leadsmind.io>"
      }
    }
  };

  const payloadString = JSON.stringify(payload);
  const wh = new Webhook(secret);
  const headers = wh.sign(payloadString);

  console.log(`Sending signed webhook to ${url}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: payloadString
    });

    const result = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${result}`);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testLiveWebhook();
