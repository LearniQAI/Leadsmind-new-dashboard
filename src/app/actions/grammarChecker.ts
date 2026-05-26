'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SOUTH_AFRICAN_WORDS = new Set([
  'colour', 'colours', 'coloured', 'colouring',
  'centre', 'centres', 'centred', 'centring',
  'organisation', 'organisations', 'organisational',
  'realise', 'realised', 'realises', 'realising', 'realisation',
  'optimise', 'optimised', 'optimises', 'optimising', 'optimisation',
  'minimise', 'minimised', 'minimises', 'minimising',
  'specialise', 'specialised', 'specialises', 'specialising', 'specialisation',
  'programme', 'programmes',
  'theatre', 'theatres',
  'defence',
  'licence', 'licences',
  'analyse', 'analysed', 'analyses', 'analysing',
  'behaviour', 'behaviours',
  'favour', 'favours', 'favourite', 'favourites',
  'labour', 'neighbor', 'neighbour', 'neighbours',
  'honor', 'honour', 'honours',
  'humor', 'humour',
  'rumor', 'rumour', 'rumours'
]);

// Fallback checking rule engine if LanguageTool is unavailable
function fallbackCheckText(text: string) {
  const issues: any[] = [];
  let match;
  
  // 1. Double words
  const doubleWordRegex = /\b(\w+)\s+\1\b/gi;
  while ((match = doubleWordRegex.exec(text)) !== null) {
    issues.push({
      message: `Repeated word: "${match[1]}"`,
      shortMessage: 'Repetitive Word',
      offset: match.index,
      length: match[0].length,
      severity: 'error',
      ruleId: 'REPEATED_WORD',
      replacements: [{ value: match[1] }]
    });
  }

  // 2. Common style issues (e.g. passive voice, wordy phrases)
  const passiveVoiceRegex = /\b(is|am|are|was|were|be|been|being)\s+([a-z]+ed|written|taken|seen|done|given|chosen|run|made)\s+by\b/gi;
  while ((match = passiveVoiceRegex.exec(text)) !== null) {
    issues.push({
      message: 'Passive voice structure. Consider revising to active voice for stronger clarity.',
      shortMessage: 'Passive Voice',
      offset: match.index,
      length: match[0].length,
      severity: 'style',
      ruleId: 'PASSIVE_VOICE',
      replacements: []
    });
  }

  // 3. Wordiness ("in order to")
  const wordyRegex = /\bin\s+order\s+to\b/gi;
  while ((match = wordyRegex.exec(text)) !== null) {
    issues.push({
      message: 'Wordy phrase. Simplify to "to".',
      shortMessage: 'Wordiness',
      offset: match.index,
      length: match[0].length,
      severity: 'clarity',
      ruleId: 'WORDINESS_IN_ORDER_TO',
      replacements: [{ value: 'to' }]
    });
  }

  // 4. Common typos (e.g. "recieve", "teh")
  const commonTypos = [
    { typo: /\brecieve\b/gi, fix: 'receive', msg: 'Spelling typo. Did you mean "receive"?' },
    { typo: /\bteh\b/gi, fix: 'the', msg: 'Spelling typo. Did you mean "the"?' },
    { typo: /\bseperate\b/gi, fix: 'separate', msg: 'Spelling typo. Did you mean "separate"?' },
    { typo: /\bundelying\b/gi, fix: 'underlying', msg: 'Spelling typo. Did you mean "underlying"?' }
  ];

  commonTypos.forEach(({ typo, fix, msg }) => {
    let typoMatch;
    typo.lastIndex = 0;
    while ((typoMatch = typo.exec(text)) !== null) {
      issues.push({
        message: msg,
        shortMessage: 'Spelling Typo',
        offset: typoMatch.index,
        length: typoMatch[0].length,
        severity: 'error',
        ruleId: 'COMMON_TYPO',
        replacements: [{ value: fix }]
      });
    }
  });

  // 5. Paragraph length check (> 6 sentences)
  const paragraphs = text.split(/\n+/);
  let charOffset = 0;
  paragraphs.forEach(para => {
    const trimmedPara = para.trim();
    if (trimmedPara.length > 0) {
      const sentences = trimmedPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 6) {
        const paraIndex = text.indexOf(para, charOffset);
        issues.push({
          message: `Paragraph is very long (${sentences.length} sentences). Consider breaking it up to improve readability.`,
          shortMessage: 'Long Paragraph',
          offset: paraIndex !== -1 ? paraIndex : 0,
          length: para.length,
          severity: 'style',
          ruleId: 'LONG_PARAGRAPH',
          replacements: []
        });
      }
    }
    charOffset += para.length + 1;
  });

  // 6. Weak filler words
  const fillerRegex = /\b(very|really|actually|basically|simply|just|literally|virtually)\b/gi;
  while ((match = fillerRegex.exec(text)) !== null) {
    issues.push({
      message: `Weak filler word: "${match[1]}". Consider removing it to make your style more authoritative.`,
      shortMessage: 'Filler Word',
      offset: match.index,
      length: match[0].length,
      severity: 'style',
      ruleId: 'FILLER_WORD',
      replacements: [{ value: '' }]
    });
  }

  // 7. Cliché marketing tropes
  const clicheRegex = /\b(synergy|disruptive|disrupt|paradigm shift|game-changer|game-changing|next-gen|next-generation|cutting-edge|revolutionary|world-class|best-in-class|ecosystem)\b/gi;
  while ((match = clicheRegex.exec(text)) !== null) {
    issues.push({
      message: `Marketing cliché: "${match[1]}". Try replacing with a more concrete, descriptive term.`,
      shortMessage: 'Marketing Cliché',
      offset: match.index,
      length: match[0].length,
      severity: 'style',
      ruleId: 'MARKETING_CLICHE',
      replacements: []
    });
  }

  // 8. Vague pronouns at sentence start
  const vaguePronounRegex = /\b(This|That|It|These|Those)\s+(is|was|are|were)\b/g;
  while ((match = vaguePronounRegex.exec(text)) !== null) {
    issues.push({
      message: `Vague pronoun start: "${match[1]} ${match[2]}". Ensure the pronoun's antecedent is clear.`,
      shortMessage: 'Vague Pronoun',
      offset: match.index,
      length: match[0].length,
      severity: 'clarity',
      ruleId: 'VAGUE_PRONOUN',
      replacements: []
    });
  }

  // 9. Wordy phrases
  const wordyPhrasesList = [
    { regex: /\bdue\s+to\s+the\s+fact\s+that\b/gi, fix: 'because', msg: 'Wordy phrase. Simplify "due to the fact that" to "because".' },
    { regex: /\bat\s+this\s+point\s+in\s+time\b/gi, fix: 'now', msg: 'Wordy phrase. Simplify "at this point in time" to "now".' },
    { regex: /\butilize\b/gi, fix: 'use', msg: 'Wordy word. Simplify "utilize" to "use".' },
    { regex: /\butilizing\b/gi, fix: 'using', msg: 'Wordy word. Simplify "utilizing" to "using".' }
  ];
  wordyPhrasesList.forEach(({ regex, fix, msg }) => {
    let phraseMatch;
    regex.lastIndex = 0;
    while ((phraseMatch = regex.exec(text)) !== null) {
      issues.push({
        message: msg,
        shortMessage: 'Wordiness',
        offset: phraseMatch.index,
        length: phraseMatch[0].length,
        severity: 'clarity',
        ruleId: 'WORDINESS_PHRASE',
        replacements: [{ value: fix }]
      });
    }
  });

  // 10. Monotonous sentence length check
  const sentencesList = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sentencesList.length >= 4) {
    let monotonousCount = 0;
    let lastWordCount = -1;
    
    for (let i = 0; i < sentencesList.length; i++) {
      const sentenceWords = sentencesList[i].split(/\s+/).filter(Boolean).length;
      if (lastWordCount !== -1 && Math.abs(sentenceWords - lastWordCount) <= 2) {
        monotonousCount++;
        if (monotonousCount >= 3) {
          const firstSentence = sentencesList[i - monotonousCount];
          const startIdx = text.indexOf(firstSentence);
          if (startIdx !== -1) {
            issues.push({
              message: 'Monotonous sentence length detected. Vary sentence lengths to improve text rhythm and readability.',
              shortMessage: 'Monotonous Sentences',
              offset: startIdx,
              length: firstSentence.length,
              severity: 'style',
              ruleId: 'MONOTONOUS_SENTENCES',
              replacements: []
            });
            break;
          }
        }
      } else {
        monotonousCount = 0;
      }
      lastWordCount = sentenceWords;
    }
  }

  return issues;
}

// Programmatic Readability Assessor
function assessReadability(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { 
      score: 100, 
      grade: 'Elementary', 
      gradeLevel: 1.0, 
      wordCount: 0, 
      avgSentenceLength: 0, 
      passiveVoicePercentage: 0,
      ease: 100 
    };
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const totalSentences = Math.max(1, sentences.length);
  const totalWords = words.length;

  let totalSyllables = 0;
  for (const word of words) {
    let cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length <= 3) {
      totalSyllables += 1;
      continue;
    }
    cleanWord = cleanWord.replace(/(?:es|ed|e)$/, '');
    const matches = cleanWord.match(/[aeiouy]{1,2}/g);
    totalSyllables += matches ? matches.length : 1;
  }

  const ease = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
  const gradeLevel = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  const roundedGrade = Math.round(Math.max(1, Math.min(20, gradeLevel)) * 10) / 10;

  let gradeStr = '8th Grade';
  if (gradeLevel <= 5) gradeStr = 'Elementary';
  else if (gradeLevel <= 8) gradeStr = 'Middle School';
  else if (gradeLevel <= 12) gradeStr = 'High School';
  else gradeStr = 'College / Professional';

  // Calculate passive voice
  const passiveVoiceRegex = /\b(is|am|are|was|were|be|been|being)\s+([a-z]+ed|written|taken|seen|done|given|chosen|run|made)\s+by\b/gi;
  const passiveCount = (text.match(passiveVoiceRegex) || []).length;
  const passiveVoicePercentage = Math.round((passiveCount / totalSentences) * 100 * 10) / 10;

  return {
    score: Math.min(100, Math.max(0, Math.round(ease))),
    grade: gradeStr,
    gradeLevel: roundedGrade,
    wordCount: totalWords,
    avgSentenceLength: Math.round((totalWords / totalSentences) * 10) / 10,
    passiveVoicePercentage: Math.min(100, passiveVoicePercentage),
    ease: Math.round(ease)
  };
}

export async function checkGrammarAndStyle(documentId: string, text: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    let matches: any[] = [];
    let isExternalApiSuccess = false;

    // 1. Call LanguageTool Check API
    try {
      const params = new URLSearchParams();
      params.append('text', text);
      params.append('language', 'en-ZA');

      const ltResponse = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (ltResponse.ok) {
        const ltData = await ltResponse.json();
        isExternalApiSuccess = true;

        if (ltData.matches) {
          ltData.matches.forEach((m: any) => {
            const flaggedWord = text.substring(m.offset, m.offset + m.length).toLowerCase().trim();
            
            // South African spelling filter: skip if flagged word is correct South African spelling
            if (SOUTH_AFRICAN_WORDS.has(flaggedWord)) {
              return;
            }

            // Determine Severity Category (error, style, clarity)
            let severity: 'error' | 'style' | 'clarity' = 'style';
            const issueType = m.rule?.issueType || '';
            const ruleCategoryId = m.rule?.category?.id || '';

            if (issueType === 'misspelling' || ruleCategoryId === 'TYPOS' || ruleCategoryId === 'GRAMMAR') {
              severity = 'error';
            } else if (ruleCategoryId === 'REDUNDANCY' || ruleCategoryId === 'CLARITY') {
              severity = 'clarity';
            } else if (issueType === 'style') {
              severity = 'style';
            }

            matches.push({
              message: m.message,
              shortMessage: m.shortMessage || 'Issue Detected',
              offset: m.offset,
              length: m.length,
              severity,
              ruleId: m.rule?.id || 'LT_RULE',
              replacements: (m.replacements || []).slice(0, 3).map((r: any) => ({ value: r.value }))
            });
          });
        }
      }
    } catch (e) {
      console.warn('LanguageTool check error, falling back to local engine:', e);
    }

    // Use local fallback rules if LanguageTool is offline
    if (!isExternalApiSuccess) {
      matches = fallbackCheckText(text);
    }

    // 2. OpenAI Tone Classification
    let tone = 'Professional';
    if (process.env.OPENAI_API_KEY && text.trim().length > 10) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Analyze the tone of the text. Reply with ONLY one word from this list: Formal, Conversational, Confident, Friendly, Empathetic, Urgent, Persuasive, Informational.'
            },
            {
              role: 'user',
              content: text.substring(0, 1500)
            }
          ],
          temperature: 0.3,
        });
        tone = response.choices[0].message.content?.trim() || 'Professional';
      } catch (err) {
        console.error('OpenAI Tone Classification Failed:', err);
      }
    }

    // 3. Programmatic Readability Calculations
    const readability = assessReadability(text);

    // Calculate overall score (penalizing for spelling/grammar errors)
    const errorCount = matches.filter(m => m.severity === 'error').length;
    const styleCount = matches.filter(m => m.severity === 'style').length;
    const clarityCount = matches.filter(m => m.severity === 'clarity').length;

    const penalty = (errorCount * 6) + (styleCount * 3) + (clarityCount * 2);
    const overallScore = Math.max(10, Math.min(100, 100 - penalty));

    const metrics = {
      overallScore,
      tone,
      readabilityGrade: readability.grade,
      gradeLevel: readability.gradeLevel
    };

    // 4. Log Grammar Checks to database
    if (documentId) {
      // Create record in content_grammar_checks
      await supabase.from('content_grammar_checks').insert({
        workspace_id: wsId,
        document_id: documentId,
        issues_json: matches,
        overall_score: overallScore,
        readability_grade: readability.gradeLevel, // Store numeric grade in DB
        tone_detected: tone,
        word_count: readability.wordCount,
        avg_sentence_length: readability.avgSentenceLength,
        passive_voice_percentage: readability.passiveVoicePercentage
      });

      // Update parent document columns
      await supabase.from('content_studio_documents').update({
        grammar_score: overallScore,
        grammar_issues_count: matches.length
      }).eq('id', documentId);
    }

    return {
      data: {
        matches,
        metrics
      }
    };
  } catch (err: any) {
    return { error: err.message || 'Grammar check failed' };
  }
}
