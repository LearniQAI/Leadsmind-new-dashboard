-- Audio Embed Mode & HTML Code Block, Step 2: add a 12th content_blocks type value,
-- 'html_code' (an admin-pasted raw-HTML block, rendered only through a sandboxed
-- <iframe srcDoc sandbox="allow-scripts"> — never dangerouslySetInnerHTML).
--
-- The table's original `type` check was declared inline and unnamed, so Postgres auto-named
-- it `content_blocks_type_check` (same convention as `content_blocks_completion_rule_check`,
-- dropped by name in 20260903000008 / 20260903000009).
alter table content_blocks drop constraint content_blocks_type_check;
alter table content_blocks add constraint content_blocks_type_check
  check (type in (
    'video','audio','reading','rich_text','quiz','assignment',
    'flashcards','download','slides','embed','live_session','html_code'
  ));

-- The Audio block's new "Embed code" mode does NOT add a new type — it stays type 'audio'
-- with content.mode = 'embed' and completion_rule 'opened' (a third-party embed's real
-- listen progress can't be observed from outside the sandbox, so it degrades to "opened"
-- rather than faking a watched %). No completion_rule constraint change is needed:
-- 'opened' and 'none' are already permitted values.
