interface BrandVoiceContext {
  name: string;
  industry: string;
  servicesDescription: string;
  targetAudience: string;
  brandPersonality: string;
  toneAdjectives: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  primaryLanguage: string;
}

export class PromptEngine {
  public static buildPayload(
    voice: BrandVoiceContext,
    contentTypeDirective: string,
    userBrief: string,
    customerContext?: string
  ): { systemInstructions: string; userContext: string } {
    
    const systemInstructions = [
      'You are the advanced, production-grade LeadsMind AI Assistant, explicitly optimized to match the architectural output quality of HubSpot Breeze AI.',
      'Your core assignment is to create content and synthesize intelligence profiles for South African enterprise sectors and SMEs.',
      '',
      '=== STRICT COMPLIANCE BRAND PROFILE ===',
      `Operating Entity Name: ${voice.name}`,
      `Vertical Industry Domain: ${voice.industry}`,
      `Core Offerings/Services Portfolio: ${voice.servicesDescription}`,
      `Target Buyer Persona Audience: ${voice.targetAudience}`,
      `Primary Personality/Archetype: ${voice.brandPersonality}`,
      `Approved Stylistic Tone Adjectives: ${voice.toneAdjectives.join(', ')}`,
      `Mandatory Vocabulary Tokens to Include: ${voice.wordsToUse.join(', ')}`,
      `Forbidden Vocabulary Tokens to Omit: ${voice.wordsToAvoid.join(', ')}`,
      `Output Target Language Formulation: ${voice.primaryLanguage}`,
      '',
      '=== SPECIFIC EXECUTION DIRECTIVE ===',
      contentTypeDirective,
      '',
      '=== REGIONAL SOUTH AFRICAN LOCALIZATION MATRIX ===',
      'You must contextualize outputs natively for South Africa.',
      '- Convert syntax references to local infrastructure landmarks, geographic regions, and cities where applicable.',
      '- Display financial currency indices using the South African Rand format exclusively (e.g., R15,000 or R2.5 Million).',
      '- Demonstrate alignment with national baseline statutory constraints including POPIA (Protection of Personal Information Act), SARS compliance metrics, and basic B-BBEE structural vernacular.',
      '- Avoid generic North American default templates or phrasing.'
    ].join('\n');

    const userContext = [
      customerContext ? `=== TARGET PROSPECT CRM DATA CONTEXT ===\n${customerContext}\n` : '',
      '=== INDIVIDUAL USER GENERATION BRIEF ===',
      userBrief
    ].join('\n');

    return { systemInstructions, userContext };
  }
}
