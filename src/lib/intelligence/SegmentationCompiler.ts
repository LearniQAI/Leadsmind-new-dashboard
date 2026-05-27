import { createAdminClient } from '@/lib/supabase/server';

export interface FilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface RuleGroup {
  logic: 'AND' | 'OR';
  rules: FilterRule[];
}

export const SegmentationCompiler = {
  /**
   * Compiles structured rule groups into secure parameterized PostgreSQL query strings.
   * Parameter placeholders ($1, $2, etc.) are used to prevent SQL injection.
   */
  compileToSql(workspaceId: string, ruleGroup: RuleGroup): { sql: string; params: any[] } {
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    const logicOperator = ruleGroup.logic === 'OR' ? ' OR ' : ' AND ';
    const conditions: string[] = [];

    for (const rule of ruleGroup.rules) {
      let sqlCond = '';
      const op = rule.operator;
      const val = rule.value;

      const getPlaceholder = (v: any = val) => {
        params.push(v);
        return `$${paramIndex++}`;
      };

      const formatOp = (fieldExpr: string) => {
        if (op === 'equals') return `${fieldExpr} = ${getPlaceholder()}`;
        if (op === 'not_equals') return `${fieldExpr} != ${getPlaceholder()}`;
        if (op === 'greater_than') return `${fieldExpr} > ${getPlaceholder()}`;
        if (op === 'less_than') return `${fieldExpr} < ${getPlaceholder()}`;
        if (op === 'contains') return `${fieldExpr} ILIKE '%' || ${getPlaceholder()} || '%'`;
        if (op === 'in') {
          // If value is an array, map to Postgres array format
          const arr = Array.isArray(v => v) ? val : [val];
          return `${fieldExpr} = ANY(${getPlaceholder(arr)})`;
        }
        return `${fieldExpr} = ${getPlaceholder()}`;
      };

      // 1. CRM Field Rules
      if (['first_name', 'last_name', 'email', 'phone', 'source', 'timezone'].includes(rule.field)) {
        sqlCond = formatOp(`c.${rule.field}`);
      }
      // 2. Tag Rule Check
      else if (rule.field === 'tags') {
        sqlCond = `c.tags @> ARRAY[${getPlaceholder()}]::TEXT[]`;
      }
      // 3. Invoice Status Rule
      else if (rule.field === 'invoice_status') {
        sqlCond = `EXISTS (
          SELECT 1 FROM public.invoices inv 
          WHERE inv.contact_id = c.id AND ${formatOp('inv.status')}
        )`;
      }
      // 4. Invoicing Outstanding ZAR Limit
      else if (rule.field === 'outstanding_zar_limit') {
        const threshold = parseFloat(val) || 0;
        const compareSign = op === 'less_than' ? '<' : op === 'greater_than' ? '>' : '>=';
        sqlCond = `COALESCE((
          SELECT SUM(amount_due - amount_paid) FROM public.invoices inv 
          WHERE inv.contact_id = c.id AND inv.currency = 'ZAR' AND inv.status = 'open'
        ), 0) ${compareSign} ${getPlaceholder(threshold)}`;
      }
      // 5. LMS Course ID Enrollment
      else if (rule.field === 'lms_course_id') {
        sqlCond = `EXISTS (
          SELECT 1 FROM public.enrollments enroll 
          WHERE enroll.contact_id = c.id AND ${formatOp('enroll.course_id')}
        )`;
      }
      // 6. LMS Course Status Enrollment
      else if (rule.field === 'lms_course_status') {
        sqlCond = `EXISTS (
          SELECT 1 FROM public.enrollments enroll 
          WHERE enroll.contact_id = c.id AND ${formatOp('enroll.status')}
        )`;
      }
      // 7. Open event tracking logs
      else if (rule.field === 'email_open_count') {
        const countThreshold = parseInt(val, 10) || 0;
        const compareSign = op === 'less_than' ? '<' : op === 'greater_than' ? '>' : '>=';
        sqlCond = `COALESCE((
          SELECT COUNT(*) FROM public.email_tracking_logs etl 
          WHERE etl.contact_id = c.id AND etl.event_type = 'open'
        ), 0) ${compareSign} ${getPlaceholder(countThreshold)}`;
      }
      // 8. Click event tracking logs
      else if (rule.field === 'email_click_count') {
        const countThreshold = parseInt(val, 10) || 0;
        const compareSign = op === 'less_than' ? '<' : op === 'greater_than' ? '>' : '>=';
        sqlCond = `COALESCE((
          SELECT COUNT(*) FROM public.email_tracking_logs etl 
          WHERE etl.contact_id = c.id AND etl.event_type = 'click'
        ), 0) ${compareSign} ${getPlaceholder(countThreshold)}`;
      }

      if (sqlCond) {
        conditions.push(sqlCond);
      }
    }

    const whereClause = conditions.length > 0 ? `AND (${conditions.join(logicOperator)})` : '';
    const sql = `SELECT DISTINCT c.* FROM public.contacts c WHERE c.workspace_id = $1 ${whereClause}`;

    return { sql, params };
  },

  /**
   * Resolves contact list by executing compiled SQL via DB RPC, or falling back
   * to programmatic client-side intersections to ensure remote environment compatibility.
   */
  async executeSegment(workspaceId: string, ruleGroup: RuleGroup): Promise<any[]> {
    const supabase = createAdminClient();
    const compiled = this.compileToSql(workspaceId, ruleGroup);

    // 1. Attempt DB RPC invocation (For local environments with applied SQL functions)
    try {
      const { data, error } = await supabase.rpc('fn_execute_segment_sql', {
        p_sql: compiled.sql,
        p_params: compiled.params
      });

      if (!error && Array.isArray(data)) {
        return data;
      }
      // Log error but proceed to programmatic fallback
      if (error && error.code !== 'P0001') {
        console.warn(`[SegmentationCompiler] DB RPC returned error: ${error.message}. Falling back to JS client.`);
      }
    } catch (err: any) {
      console.warn(`[SegmentationCompiler] DB RPC call failed: ${err.message}. Falling back to JS client.`);
    }

    // 2. Programmatic Fallsack (TypeScript-side relational intersection)
    try {
      // 2.a Fetch all contacts for workspace
      const { data: contacts, error: cErr } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (cErr || !contacts || contacts.length === 0) {
        return [];
      }

      const contactIds = contacts.map(c => c.id);

      // 2.b Fetch related collections in parallel
      const [invoicesRes, enrollmentsRes, logsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('workspace_id', workspaceId),
        supabase.from('enrollments').select('*').in('contact_id', contactIds),
        supabase.from('email_tracking_logs').select('*').eq('workspace_id', workspaceId)
      ]);

      const invoices = invoicesRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const logs = logsRes.data || [];

      // 2.c Evaluate rules group in JS
      return contacts.filter(contact => {
        const contactInvoices = invoices.filter(i => i.contact_id === contact.id);
        const contactEnrollments = enrollments.filter(e => e.contact_id === contact.id);
        const contactLogs = logs.filter(l => l.contact_id === contact.id);

        const ruleMatches = ruleGroup.rules.map(rule => {
          const val = rule.value;
          const op = rule.operator;

          const matchCompare = (dbVal: any) => {
            if (op === 'equals') return dbVal === val;
            if (op === 'not_equals') return dbVal !== val;
            if (op === 'greater_than') return dbVal > val;
            if (op === 'less_than') return dbVal < val;
            if (op === 'contains') return String(dbVal || '').toLowerCase().includes(String(val).toLowerCase());
            if (op === 'in') return Array.isArray(val) ? val.includes(dbVal) : val === dbVal;
            return dbVal === val;
          };

          // Check fields
          if (['first_name', 'last_name', 'email', 'phone', 'source', 'timezone'].includes(rule.field)) {
            return matchCompare(contact[rule.field]);
          }

          if (rule.field === 'tags') {
            return Array.isArray(contact.tags) && contact.tags.includes(val);
          }

          if (rule.field === 'invoice_status') {
            return contactInvoices.some(i => matchCompare(i.status));
          }

          if (rule.field === 'outstanding_zar_limit') {
            const threshold = parseFloat(val) || 0;
            const outstanding = contactInvoices
              .filter(i => i.currency === 'ZAR' && i.status === 'open')
              .reduce((sum, i) => sum + (parseFloat(i.amount_due) - parseFloat(i.amount_paid)), 0);

            if (op === 'less_than') return outstanding < threshold;
            if (op === 'greater_than') return outstanding > threshold;
            return outstanding >= threshold;
          }

          if (rule.field === 'lms_course_id') {
            return contactEnrollments.some(e => matchCompare(e.course_id));
          }

          if (rule.field === 'lms_course_status') {
            return contactEnrollments.some(e => matchCompare(e.status));
          }

          if (rule.field === 'email_open_count') {
            const count = contactLogs.filter(l => l.event_type === 'open').length;
            const threshold = parseInt(val, 10) || 0;
            if (op === 'less_than') return count < threshold;
            if (op === 'greater_than') return count > threshold;
            return count >= threshold;
          }

          if (rule.field === 'email_click_count') {
            const count = contactLogs.filter(l => l.event_type === 'click').length;
            const threshold = parseInt(val, 10) || 0;
            if (op === 'less_than') return count < threshold;
            if (op === 'greater_than') return count > threshold;
            return count >= threshold;
          }

          return false;
        });

        if (ruleGroup.logic === 'OR') {
          return ruleMatches.some(m => m === true);
        } else {
          return ruleMatches.every(m => m === true);
        }
      });
    } catch (fallbackErr: any) {
      console.error(`[SegmentationCompiler] Fallback filtration failed: ${fallbackErr.message}`);
      return [];
    }
  }
};
