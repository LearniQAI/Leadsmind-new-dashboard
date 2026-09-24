// Client-safe URL builders for a Google-Drive-sourced video block ('gdrive' provider). Every
// surface that renders one — student player, instructor lesson preview, public free-preview page,
// builder canvas and settings panel — goes through the same access-gated same-origin routes, never
// a Drive URL. Returns null for a block that isn't a validated Drive video.
export function driveVideoUrls(block: {
  id: string;
  video_provider?: string | null;
  video_asset_id?: string | null;
}): { src: string; poster: string } | null {
  if (block.video_provider !== 'gdrive' || !block.video_asset_id) return null;
  const qs = `contentBlockId=${encodeURIComponent(block.id)}`;
  return {
    src: `/api/video/${block.video_asset_id}/stream?${qs}`,
    poster: `/api/video/${block.video_asset_id}/poster?${qs}`,
  };
}
