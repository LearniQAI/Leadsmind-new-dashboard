'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});

export async function getAIChatResponse(messages: { role: 'user' | 'assistant' | 'system', content: string }[]) {
 if (!process.env.OPENAI_API_KEY) {
  return { error: 'OpenAI API key not configured' };
 }

 try {
  const response = await openai.chat.completions.create({
   model: 'gpt-4o-mini',
   messages: [
    { 
     role: 'system', 
     content: 'You are the LeadsMind AI Assistant. You help users manage their business dashboard, CRM, and marketing automation. Be concise, professional, and helpful. Use a futuristic and efficient tone.' 
    },
    ...messages
   ],
   temperature: 0.7,
  });

  return { content: response.choices[0].message.content };
 } catch (error: any) {
  console.error('OpenAI Error:', error);
  return { error: error.message || 'Failed to get AI response' };
 }
}
