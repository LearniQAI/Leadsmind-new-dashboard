-- One live SKU per workspace. Partial: items with no SKU (NULL or blank) are unconstrained --
-- the Add item form sends '' for an empty SKU, so a plain UNIQUE (workspace_id, sku) would
-- reject a second SKU-less item. Case/whitespace-insensitive so "ABC-1" and " abc-1 " clash.
--
-- Applied after the 11 duplicate rows of workspace 1f061259 / SKU 373363-kdjd were removed
-- (production had no other (workspace_id, lower(btrim(sku))) duplicates); the index build
-- fails loudly, changing nothing, if any duplicate exists.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_workspace_sku_key
  ON public.inventory_items (workspace_id, lower(btrim(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';
