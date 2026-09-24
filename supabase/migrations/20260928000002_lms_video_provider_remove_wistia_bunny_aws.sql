-- LMS Video: the provider set is now exactly YouTube, Vimeo and Google Drive. Wistia (its
-- "completion" was a fabricated 90% fired on mount), Bunny.net and AWS (no integration of any
-- kind existed — dropdown options only) were removed from the editor, the player and the
-- thumbnail route on 2026-09-24. This narrows the CHECK so no write path can store them again.
--
-- Existing-data check before writing this: 0 content_blocks rows had video_provider in
-- ('wistia','bunny','aws'), and 0 video file_urls pointed at a Wistia/Bunny/S3/CloudFront host.
-- ADD CONSTRAINT validates every existing row, so if one had appeared since, this migration fails
-- loudly instead of silently breaking a block.

alter table content_blocks drop constraint content_blocks_video_provider_check;
alter table content_blocks add constraint content_blocks_video_provider_check check (
  video_provider in ('youtube', 'vimeo', 'gdrive')
  or video_provider is null
);
