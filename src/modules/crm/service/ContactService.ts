import { ContactRepository } from "@/modules/crm/repository/ContactRepository";
import { AppError, toClientError } from "@/shared/errors/AppError";
import { sqlStateOf } from "@/shared/errors/dbErrors";
import { logger } from "@/shared/logger";
import {
  syncContactTagsToRelational,
  syncBulkContactTagAdd,
  syncBulkContactTagRemove,
} from "@/modules/tags/sync/syncContactTags";

type Result<T> = { success: true; data: T; replayed?: boolean } | { success: false; error: string; code?: string; details?: Record<string, unknown> };

// Maps AppError codes we want to surface verbatim to the client. Anything
// not in this list falls back to a generic message — repository/DB errors
// can contain internal details (constraint names, column names, etc.) that
// shouldn't reach the client, only the logs.
const CLIENT_SAFE_CODES = new Set(["TAG_EXISTS", "VALIDATION_ERROR", "DUPLICATE_EMAIL"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function toResult<T>(fn: () => Promise<T>, logContext: string): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) {
      logger.error({ context: err.context }, `[${logContext}] ${err.code}: ${err.message}`);
      const message = CLIENT_SAFE_CODES.has(err.code) ? err.message : "Something went wrong. Please try again.";
      return { success: false, error: message, code: err.code, ...(err.code === "DUPLICATE_EMAIL" ? { details: err.context } : {}) };
    }
    logger.error({ err }, `[${logContext}] Unexpected error`);
    // Constraint violations (duplicate, bad id format, missing parent) get a plain-language message; the raw
    // DB text is logged by toClientError with a request id and never returned.
    const mapped = toClientError(err);
    if (mapped.requestId) return { success: false, error: mapped.error, code: mapped.code };
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export class ContactService {
  constructor(private repo: ContactRepository) {}

  async getContact(id: string, workspaceId: string) {
    return toResult(async () => {
      const contact = await this.repo.findById(id, workspaceId);
      if (!contact) throw new AppError("NOT_FOUND", "Contact not found", 404);
      return contact;
    }, "contacts.getContact");
  }

  async getContactActivities(contactId: string, workspaceId: string) {
    return toResult(() => this.repo.findActivities(contactId, workspaceId), "contacts.getContactActivities");
  }

  async getContactNotes(contactId: string, workspaceId: string) {
    return toResult(() => this.repo.findNotes(contactId, workspaceId), "contacts.getContactNotes");
  }

  async getContactTasks(contactId: string, workspaceId: string) {
    return toResult(() => this.repo.findTasks(contactId, workspaceId), "contacts.getContactTasks");
  }

  async searchContacts(workspaceId: string, query: string) {
    return toResult(() => this.repo.search(workspaceId, query, 10), "contacts.searchContacts");
  }

  async checkDuplicateContact(workspaceId: string, email: string) {
    return toResult(async () => {
      if (!email) return { exists: false, contact: null };
      const contact = await this.repo.findByEmail(workspaceId, email);
      return { exists: !!contact, contact };
    }, "contacts.checkDuplicateContact");
  }

  async createContact(
    workspaceId: string,
    values: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      source?: string;
      ownerId?: string;
      tags?: string[];
      consentTimestamp?: string;
      consentIp?: string;
      consentFormId?: string;
      processingPurposeScope?: string;
      /** One UUID per "New client" modal open; a replay returns the contact already created. */
      clientOperationId?: string | null;
    },
  ): Promise<Result<any>> {
    let replayed = false;
    const result = await toResult(async () => {
      const operationId = values.clientOperationId ?? null;
      if (operationId !== null && !UUID_RE.test(operationId)) {
        throw new AppError("VALIDATION_ERROR", "Invalid request. Please close and reopen the form.", 422);
      }
      if (operationId) {
        const prior = await this.repo.findByOperationId(workspaceId, operationId);
        if (prior) { replayed = true; return prior; }
      }

      // A client with this email already exists in the workspace: say so (and which one) instead of letting the
      // unique key fail with a raw constraint error. Case-insensitive.
      const email = values.email?.trim() || undefined;
      if (email) {
        const existing = await this.repo.findByEmail(workspaceId, email);
        if (existing) {
          // The "duplicate" may be THIS very submit's twin that just won the race (same operation id): that's a replay,
          // not a conflict.
          if (operationId) {
            const prior = await this.repo.findByOperationId(workspaceId, operationId);
            if (prior) { replayed = true; return prior; }
          }
          throw new AppError("DUPLICATE_EMAIL", "A client with this email already exists.", 409, { existing });
        }
      }

      // Affiliate attribution — best-effort, never blocks contact creation.
      let referredByAffiliateId: string | null = null;
      let referredProgrammeId: string | null = null;
      try {
        const { resolveAttribution } = await import("@/lib/affiliate/attribution");
        const attr = await resolveAttribution(null, values.email);
        if (attr.affiliateId && attr.programmeId) {
          referredByAffiliateId = attr.affiliateId;
          referredProgrammeId = attr.programmeId;
        }
      } catch (e) {
        logger.error({ err: e }, "[contacts.createContact] attribution resolution failed");
      }

      const payload: Record<string, unknown> = {
        first_name: values.firstName,
        last_name: values.lastName,
        email: email ?? null,
        phone: values.phone,
        source: values.source,
        owner_id: values.ownerId ?? null,
        tags: values.tags ?? [],
        client_operation_id: operationId,
        referred_by_affiliate_id: referredByAffiliateId,
        referred_programme_id: referredProgrammeId,
      };

      if (values.consentTimestamp) {
        payload.consent_timestamp = values.consentTimestamp;
        payload.consent_ip = values.consentIp ?? "unknown";
      }
      if (values.consentFormId) payload.consent_form_id = values.consentFormId;
      if (values.processingPurposeScope) payload.processing_purpose_scope = values.processingPurposeScope;

      let contact: any;
      try {
        contact = await this.repo.create(workspaceId, payload);
      } catch (err) {
        // Lost a race: an identical submit (same operation id) or another writer (same email) got there first.
        if (sqlStateOf(err) === "23505") {
          if (operationId) {
            const winner = await this.repo.findByOperationId(workspaceId, operationId);
            if (winner) { replayed = true; return winner; }
          }
          if (email) {
            const existing = await this.repo.findByEmail(workspaceId, email);
            if (existing) throw new AppError("DUPLICATE_EMAIL", "A client with this email already exists.", 409, { existing });
          }
        }
        throw err;
      }

      // Best-effort webhook — failure here shouldn't fail contact creation.
      try {
        const { dispatchWebhook } = await import("@/lib/webhooks/dispatcher");
        dispatchWebhook(workspaceId, "contact.created", {
          contact: {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
          },
        }).catch(() => {});
      } catch (e) {
        logger.error({ err: e }, "[contacts.createContact] webhook dispatch failed");
      }

      await this.repo.logActivity(workspaceId, contact.id, {
        type: "edit",
        description: "Contact created manually",
        metadata: { source: values.source ?? "form" },
      });

      syncContactTagsToRelational(workspaceId, contact.id, values.tags ?? []).catch(() => {});

      return contact;
    }, "contacts.createContact");
    return result.success ? { ...result, replayed } : result;
  }

  async updateContact(
    id: string,
    workspaceId: string,
    values: { firstName: string; lastName: string; email: string; phone?: string; source?: string; ownerId?: string; tags?: string[] },
  ) {
    return toResult(async () => {
      const payload = {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        source: values.source,
        owner_id: values.ownerId ?? null,
        tags: values.tags ?? [],
      };

      const contact = await this.repo.update(id, workspaceId, payload);
      if (!contact) throw new AppError("NOT_FOUND", "Contact not found", 404);

      try {
        const { dispatchWebhook } = await import("@/lib/webhooks/dispatcher");
        dispatchWebhook(workspaceId, "contact.updated", {
          contact: { id: contact.id, first_name: contact.first_name, last_name: contact.last_name, email: contact.email, phone: contact.phone },
        }).catch(() => {});
      } catch (e) {
        logger.error({ err: e }, "[contacts.updateContact] webhook dispatch failed");
      }

      syncContactTagsToRelational(workspaceId, contact.id, values.tags ?? []).catch(() => {});

      return contact;
    }, "contacts.updateContact");
  }

  async deleteContact(id: string, workspaceId: string) {
    return toResult(() => this.repo.delete(id, workspaceId), "contacts.deleteContact");
  }

  // ---------- tags ----------
  // Tag registry (create/rename/delete/list by id) now lives in
  // src/modules/tags/service/TagService.ts, backed by the relational `tags` table.

  async addTag(contactId: string, workspaceId: string, tag: string) {
    return toResult(async () => {
      const tags = await this.repo.getTags(contactId, workspaceId);
      if (tags.includes(tag)) return;
      const nextTags = [...tags, tag];
      await this.repo.setTags(contactId, workspaceId, nextTags);
      syncContactTagsToRelational(workspaceId, contactId, nextTags).catch(() => {});
    }, "contacts.addTag");
  }

  async bulkAddTag(ids: string[], tag: string, workspaceId: string) {
    return toResult(async () => {
      logger.info({ count: ids.length, tag, workspaceId }, "contact.bulkAddTag");
      await this.repo.bulkAddTagRpc(ids, tag, workspaceId);
      await this.repo.logActivitiesBulk(
        ids.map((id) => ({
          workspace_id: workspaceId,
          contact_id: id,
          type: "system",
          description: `Strategic tag added: ${tag}`,
          metadata: { tag, operation: "bulk_tag", event: "tagging" },
        })),
      );
      syncBulkContactTagAdd(workspaceId, tag, ids).catch(() => {});
    }, "contacts.bulkAddTag");
  }

  async bulkRemoveTag(ids: string[], tag: string, workspaceId: string) {
    return toResult(async () => {
      logger.info({ count: ids.length, tag, workspaceId }, "contact.bulkRemoveTag");
      await this.repo.bulkRemoveTagRpc(ids, tag, workspaceId);
      syncBulkContactTagRemove(workspaceId, tag, ids).catch(() => {});
    }, "contacts.bulkRemoveTag");
  }

  // ---------- notes ----------

  async createNote(workspaceId: string, contactId: string, content: string) {
    return toResult(async () => {
      const note = await this.repo.createNote(workspaceId, contactId, content);
      await this.repo.logActivity(workspaceId, contactId, {
        type: "note",
        description: "Added a new note",
      });
      return note;
    }, "contacts.createNote");
  }

  async deleteNote(id: string, workspaceId: string) {
    return toResult(() => this.repo.deleteNote(id, workspaceId), "contacts.deleteNote");
  }

  // ---------- tasks ----------

  async createTask(workspaceId: string, contactId: string, title: string, dueDate?: string) {
    return toResult(() => this.repo.createTask(workspaceId, contactId, title, dueDate), "contacts.createTask");
  }

  async toggleTaskStatus(id: string, workspaceId: string, currentStatus: string) {
    return toResult(async () => {
      const newStatus = currentStatus === "todo" ? "completed" : "todo";
      await this.repo.updateTaskStatus(id, workspaceId, newStatus);
    }, "contacts.toggleTaskStatus");
  }

  async deleteTask(id: string, workspaceId: string) {
    return toResult(() => this.repo.deleteTask(id, workspaceId), "contacts.deleteTask");
  }
}