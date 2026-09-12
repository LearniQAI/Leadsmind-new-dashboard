-- Microsoft Teams reuses the single Outlook/M365 connection (Task 70) and has
-- no separate OAuth of its own. The integrations-hub Teams card previously had
-- no way to distinguish "Outlook connected with the Teams scope granted" from
-- "Outlook connected but the OnlineMeetings.ReadWrite scope was never granted
-- (pre-Task-70 connection, or Azure/tenant consent didn't include it)" — both
-- looked identical to a plain, unconnected "Connect" button. This column lets
-- syncWorkspaceCalendarIntegrationRow() record the middle state explicitly so
-- the UI can show a real "Reconnect Outlook to enable Teams" state instead of
-- silently claiming either "Connect" (wrong — Outlook already exists) or
-- "Connected" (wrong — Teams meeting creation would 403).
alter table public.workspace_integrations
  add column if not exists needs_reconnect boolean not null default false;

-- Independent pre-existing bug found while wiring the above: Task 70 (Zoom,
-- and now this Microsoft Teams fix) writes workspace_integrations rows with
-- category='video_conferencing', but the table's original category check
-- constraint (20240101000207_settings_connections.sql) never included that
-- value. Every syncWorkspaceCalendarIntegrationRow() upsert for zoom (and now
-- outlook's derived Teams row) has been throwing a 23514 constraint violation
-- — confirmed live: no 'Zoom' row exists in workspace_integrations at all
-- despite the Zoom OAuth token itself being stored successfully, so a user
-- connecting Zoom would see it fail right after the real token was saved.
alter table public.workspace_integrations
  drop constraint if exists workspace_integrations_category_check;

alter table public.workspace_integrations
  add constraint workspace_integrations_category_check check (category in (
    'bank', 'payment_gateway', 'tax_government',
    'identity_verification', 'credit_bureau', 'fraud_screening',
    'email_calendar', 'communication', 'automation',
    'ecommerce', 'marketing', 'analytics', 'courier',
    'video_conferencing'
  ));
