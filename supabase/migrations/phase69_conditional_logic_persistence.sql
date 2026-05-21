-- Conditional Logic Rules Persistence
-- Dedicated table for storing form conditional logic rules.
-- Rules are also embedded in forms.config JSON for backward compatibility;
-- this table serves as the authoritative source for rule queries and analytics.

CREATE TABLE IF NOT EXISTS form_logic_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  operator    TEXT NOT NULL CHECK (operator IN (
    'equals', 'not_equals', 'contains', 'greater_than', 'less_than',
    'checked', 'unchecked'
  )),
  comparison_value TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL CHECK (action IN (
    'show_field', 'hide_field', 'skip_step', 'jump_to_step', 'set_value'
  )),
  target_field_or_step TEXT NOT NULL,
  target_value TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_logic_rules_form_id ON form_logic_rules(form_id);

-- Enable Row-Level Security
ALTER TABLE form_logic_rules ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage rules for forms they own or collaborate on
CREATE POLICY form_logic_rules_select ON form_logic_rules
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms WHERE created_by = auth.uid()
      UNION
      SELECT form_id FROM form_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY form_logic_rules_insert ON form_logic_rules
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT id FROM forms WHERE created_by = auth.uid()
      UNION
      SELECT form_id FROM form_collaborators WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY form_logic_rules_update ON form_logic_rules
  FOR UPDATE USING (
    form_id IN (
      SELECT id FROM forms WHERE created_by = auth.uid()
      UNION
      SELECT form_id FROM form_collaborators WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY form_logic_rules_delete ON form_logic_rules
  FOR DELETE USING (
    form_id IN (
      SELECT id FROM forms WHERE created_by = auth.uid()
      UNION
      SELECT form_id FROM form_collaborators WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_form_logic_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_logic_rules_updated_at ON form_logic_rules;
CREATE TRIGGER trg_form_logic_rules_updated_at
  BEFORE UPDATE ON form_logic_rules
  FOR EACH ROW EXECUTE FUNCTION update_form_logic_rules_updated_at();
