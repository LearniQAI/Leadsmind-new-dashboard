// Single switch for the AI Research Agent (AI Studio research portal, the contact "AI Insights"
// research tab, the batch research route and the pre-meeting-brief cron). Off for launch: the
// agent has no real search source, so it must not be offered or run until one exists.
// NEXT_PUBLIC_ so client components can read it; it is inlined at build time, so flipping it
// needs a redeploy. Set NEXT_PUBLIC_AI_RESEARCH_ENABLED=true to re-enable everything at once.
export const AI_RESEARCH_ENABLED = process.env.NEXT_PUBLIC_AI_RESEARCH_ENABLED === 'true';
