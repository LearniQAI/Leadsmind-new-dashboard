// A redacted summary of a Meta webhook payload for logging: event type, platform ids and counts only. The raw
// payload carries phone numbers, profile names and message text, none of which belong in logs.
export function summarizeMetaPayload(payload: any) {
  const entries: any[] = Array.isArray(payload?.entry) ? payload.entry : [];
  let messaging = 0;
  let changes = 0;
  let messages = 0;
  let statuses = 0;
  const fields = new Set<string>();
  for (const e of entries) {
    messaging += Array.isArray(e?.messaging) ? e.messaging.length : 0;
    for (const c of Array.isArray(e?.changes) ? e.changes : []) {
      changes++;
      if (typeof c?.field === 'string') fields.add(c.field);
      messages += Array.isArray(c?.value?.messages) ? c.value.messages.length : 0;
      statuses += Array.isArray(c?.value?.statuses) ? c.value.statuses.length : 0;
    }
  }
  return {
    object: typeof payload?.object === 'string' ? payload.object : null,
    entryIds: entries.slice(0, 10).map((e) => String(e?.id ?? '')),
    entries: entries.length,
    messaging,
    changes,
    fields: [...fields],
    messages,
    statuses,
  };
}
