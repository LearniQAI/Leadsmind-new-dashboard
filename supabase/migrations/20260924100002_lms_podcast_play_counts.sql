-- LMS Audio Phase 5: podcast play counts.
--
-- Privacy-deliberate design (see the phase report for full reasoning): this table stores ONLY a
-- per-episode, per-day integer counter. No IP address, no user agent, no session/device
-- identifier, no per-request row at all — a real listener's individual requests are never
-- distinguishable from each other in this table, by construction, not by a promise to not query
-- for it. This is "stream request volume," honestly labeled as such everywhere it's surfaced —
-- never described as "listeners" or "plays by person," because this data cannot support that
-- claim and a public podcast feed's privacy bar does not permit building toward it.

create table podcast_episode_plays (
  id uuid primary key default gen_random_uuid(),
  podcast_episode_id uuid not null references podcast_episodes(id) on delete cascade,
  play_date date not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (podcast_episode_id, play_date)
);
create index idx_podcast_episode_plays_episode on podcast_episode_plays(podcast_episode_id, play_date);

alter table podcast_episode_plays enable row level security;

-- Admin-read only (the podcast admin screens' per-show/per-episode view) — never public. The
-- streaming route that WRITES to this table uses the service-role client (bypasses RLS
-- entirely, same as every other write path in this feature), so no INSERT/UPDATE policy is
-- needed here at all — this table has no legitimate direct-client write path, gated or not.
create policy "workspace members read podcast_episode_plays"
  on podcast_episode_plays
  for select
  to public
  using (
    exists (
      select 1
      from podcast_episodes pe
      join podcast_shows ps on ps.id = pe.podcast_show_id
      join workspace_members wm on wm.workspace_id = ps.workspace_id
      where pe.id = podcast_episode_plays.podcast_episode_id
        and wm.user_id = auth.uid()
    )
  );
