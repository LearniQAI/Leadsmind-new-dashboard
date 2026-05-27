const rawContent = JSON.stringify({
  company_snapshot: {
    legal_name: "Zafro Logistics Pty Ltd",
    headquarters: "Johannesburg, South Africa",
    headcount_estimation: "45 employees",
    established_year: "2018"
  },
  plain_language_operational_profile: "Provides logistics and route coordination across South Africa.",
  key_decision_makers: [
    { name: "Lerato Sithole", role: "CIO", linkedin_url: "https://linkedin.com/in/lerato-sithole" }
  ],
  recent_news_events: [],
  detected_technology_stack: ["WordPress", "Mailchimp"],
  active_hiring_signals: ["Route Manager"],
  inferred_pain_points: [],
  suggested_conversation_openers: [],
  individual_profile: {
    professional_history: "Lerato Sithole has 12 years of experience. Personal cell is +27-82-555-0199, home address 124 Juta St, Braamfontein. Enjoys spending time with her two kids.",
    speaking_profiles: ["Southern Africa Tech Summit 2025"],
    accolades: ["CIO of the Year Nominee 2025"],
    strategic_focus_areas: ["Field service optimization", "Route planning tools integrations"]
  }
});

let cleanContentStr = rawContent;

const phoneRegex = /(\+?[0-9]{1,4}[-.\s]??)?[0-9]{2,3}[-.\s]??[0-9]{3,4}[-.\s]??[0-9]{4}/g;
const privateEmailRegex = /[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|icloud|live)\.com/gi;
const addressRegex = /\d+\s+[A-Za-z0-9\s]{3,}\s*(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way)/gi;
const familyRegex = /(lives\s+with\s+(his|her)\s+(\w+\s+)?(wife|husband|kids|children|son|daughter)|spending\s+time\s+with\s+(his|her)\s+(\w+\s+)?(wife|husband|kids|children|son|daughter)|married\s+to\s+[A-Za-z\s]+|enjoys\s+[\w\s]+(kids|children|son|daughter|wife|husband|family))/gi;

console.log("Original Phone match:", phoneRegex.test(cleanContentStr));
console.log("Original Address match:", addressRegex.test(cleanContentStr));
console.log("Original Family match:", familyRegex.test(cleanContentStr));

cleanContentStr = cleanContentStr.replace(phoneRegex, '[REDACTED PHONE]');
cleanContentStr = cleanContentStr.replace(privateEmailRegex, '[REDACTED EMAIL]');
cleanContentStr = cleanContentStr.replace(addressRegex, '[REDACTED ADDRESS]');
cleanContentStr = cleanContentStr.replace(familyRegex, '[REDACTED FAMILY]');

const parsed = JSON.parse(cleanContentStr);
console.log("Parsed individual profile:", JSON.stringify(parsed.individual_profile));
