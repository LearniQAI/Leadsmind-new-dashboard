/**
 * AIService — Isolated orchestrator for AI operations.
 * Manages request caching, API key detection, retries, and local CRO rules fallback.
 */

import { PromptManager } from './PromptManager';

const aiCache = new Map<string, any>();
const rateLimitTrack = new Map<string, number[]>();

export interface AIServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const AIService = {
  /**
   * Safely invoke AI model or trigger local CRO rules fallback.
   */
  async invokeAI(
    cacheKey: string,
    prompt: string,
    fallbackGenerator: () => any
  ): Promise<AIServiceResponse> {
    // 1. Prompt caching lookup
    if (aiCache.has(cacheKey)) {
      return { success: true, data: aiCache.get(cacheKey) };
    }

    // 2. Rate limit check (max 10 requests per minute)
    const now = Date.now();
    const timestamps = rateLimitTrack.get(cacheKey) || [];
    const validTimestamps = timestamps.filter(t => now - t < 60000);
    validTimestamps.push(now);
    rateLimitTrack.set(cacheKey, validTimestamps);

    if (validTimestamps.length > 10) {
      return { success: false, error: 'Rate limit exceeded. Please wait a moment.' };
    }

    // 3. Retry loop structure (max 2 retries)
    let attempts = 0;
    const maxRetries = 2;

    while (attempts <= maxRetries) {
      try {
        attempts++;
        
        // Attempt external LLM query (scaffolded fallback check)
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
        let responseJson: any = null;

        if (apiKey) {
          responseJson = await this.queryExternalLLM(prompt, apiKey);
        }

        // 4. Fall back to local rules-based engine if LLM fails or is not configured
        if (!responseJson) {
          responseJson = fallbackGenerator();
        }

        // 5. Structure validation check
        if (responseJson && typeof responseJson === 'object') {
          aiCache.set(cacheKey, responseJson);
          return { success: true, data: responseJson };
        }

        throw new Error('Malformed AI output structure.');
      } catch (err: any) {
        if (attempts > maxRetries) {
          return { success: false, error: err.message || 'AI request failed after retries.' };
        }
        // Small backoff delay
        await new Promise(r => setTimeout(r, attempts * 500));
      }
    }

    return { success: false, error: 'AI Orchestration failed.' };
  },

  /**
   * External model call query scaffold.
   */
  async queryExternalLLM(prompt: string, apiKey: string): Promise<any> {
    try {
      // In production, this targets the Gemini API or OpenAI API endpoints
      // We implement a fast fetch call wrapper that times out after 6 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://api.openai.com/v1/chat/completures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        signal: signalAborted(controller),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PromptManager.getSystemInstruction() },
            { role: 'user', content: prompt }
          ]
        })
      });

      clearTimeout(timeoutId);
      if (!res.ok) return null;
      
      const body = await res.json();
      return JSON.parse(body.choices[0].message.content);
    } catch {
      return null;
    }
  }
};

function signalAborted(controller: AbortController) {
  return controller.signal;
}
