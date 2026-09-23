-- Atomic increment for podcast_episode_plays — avoids a read-then-write race between two
-- simultaneous first-request-of-the-day inserts (two listeners hitting play at the same moment).
-- SECURITY DEFINER only to let the service-role streaming route call it via RPC in one round
-- trip; not exposed beyond that (no anon/authenticated grant needed — the route already uses the
-- service-role client, which bypasses grants entirely, same as every other write path here).
create or replace function public.increment_podcast_episode_play(p_episode_id uuid, p_play_date date)
returns void
language sql
as $$
  insert into public.podcast_episode_plays (podcast_episode_id, play_date, request_count)
  values (p_episode_id, p_play_date, 1)
  on conflict (podcast_episode_id, play_date)
  do update set request_count = podcast_episode_plays.request_count + 1, updated_at = now();
$$;
