import { ContactRepository } from "@/modules/crm/repository/ContactRepository";
import { AppError } from "@/shared/errors/AppError";
import { logger } from "@/shared/logger";

type Result<T> = { success: true; data: T } | { success: false; error: string };

// Maps AppError codes we want to surface verbatim to the client. Anything
// not in this list falls back to a generic message — repository/DB errors
// can contain internal details (constraint names, column names, etc.) that
// shouldn't reach the client, only the logs.
const CLIENT_SAFE_CODES = new Set(["TAG_EXISTS", "VALIDATION_ERROR"]);

async function toResult<T>(fn: () => Promise<T>, logContext: string): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) {
      logger.error({ context: err.context }, `[${logContext}] ${err.code}: ${err.message}`);
      const message = CLIENT_SAFE_CODES.has(err.code) ? err.message : "Something went wrong. Please try again.";
      return { success: false, error: message };
    }
    logger.error({ err }, `[${logContext}] Unexpected error`);
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
      email: string;
      phone?: string;
      source?: string;
      ownerId?: string;
      tags?: string[];
      consentTimestamp?: string;
      consentIp?: string;
      consentFormId?: string;
      processingPurposeScope?: string;
    },
  ) {
    return toResult(async () => {
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
        email: values.email,
        phone: values.phone,
        source: values.source,
        owner_id: values.ownerId ?? null,
        tags: values.tags ?? [],
        referred_by_affiliate_id: referredByAffiliateId,
        referred_programme_id: referredProgrammeId,
      };

      if (values.consentTimestamp) {
        payload.consent_timestamp = values.consentTimestamp;
        payload.consent_ip = values.consentIp ?? "unknown";
      }
      if (values.consentFormId) payload.consent_form_id = values.consentFormId;
      if (values.processingPurposeScope) payload.processing_purpose_scope = values.processingPurposeScope;

      const contact = await this.repo.create(workspaceId, payload);

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

      return contact;
    }, "contacts.createContact");
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

      return contact;
    }, "contacts.updateContact");
  }

  async deleteContact(id: string, workspaceId: string) {
    return toResult(() => this.repo.delete(id, workspaceId), "contacts.deleteContact");
  }

  // ---------- tags ----------

  async getWorkspaceTags(workspaceId: string) {
    return toResult(async () => {
      const [registryTags, counts] = await Promise.all([
        this.repo.listRegistryTags(workspaceId),
        this.repo.listTagsAndCounts(workspaceId),
      ]);

      const countMap = new Map(counts.map((c) => [c.name, c.count]));
      // Registry tags always appear, even at count 0.
      for (const t of registryTags) {
        if (!countMap.has(t.name)) countMap.set(t.name, 0);
      }

      return Array.from(countMap.entries()).map(([name, count]) => ({ id: name, name, count }));
    }, "contacts.getWorkspaceTags");
  }

  async createRegistryTag(workspaceId: string, name: string) {
    return toResult(() => this.repo.createRegistryTag(workspaceId, name), "contacts.createRegistryTag");
  }

  async addTag(contactId: string, workspaceId: string, tag: string) {
    return toResult(async () => {
      const tags = await this.repo.getTags(contactId, workspaceId);
      if (tags.includes(tag)) return;
      await this.repo.setTags(contactId, workspaceId, [...tags, tag]);
    }, "contacts.addTag");
  }

  /**
   * Loop-based by default (safe, no DB dependency). If you've created the
   * `bulk_add_tag` Postgres function, swap the loop below for
   * `await this.repo.bulkAddTagViaRpc(ids, tag, workspaceId);` for an
   * atomic, single-round-trip version — see ContactRepository for details.
   */
  async bulkAddTag(ids: string[], tag: string, workspaceId: string) {
    return toResult(async () => {
      for (const id of ids) {
        const tags = await this.repo.getTags(id, workspaceId);
        if (!tags.includes(tag)) {
          await this.repo.setTags(id, workspaceId, [...tags, tag]);
        }
      }
      await this.repo.logActivitiesBulk(
        ids.map((id) => ({
          workspace_id: workspaceId,
          contact_id: id,
          type: "system",
          description: `Strategic tag added: ${tag}`,
          metadata: { tag, operation: "bulk_tag", event: "tagging" },
        })),
      );
    }, "contacts.bulkAddTag");
  }

  /**
   * Falls back to a scoped per-row loop if you haven't created a
   * `bulk_remove_tag` RPC yet — see ContactRepository for the RPC version.
   */
  async bulkRemoveTag(ids: string[], tag: string, workspaceId: string) {
    return toResult(async () => {
      for (const id of ids) {
        const tags = await this.repo.getTags(id, workspaceId);
        await this.repo.setTags(id, workspaceId, tags.filter((t) => t !== tag));
      }
    }, "contacts.bulkRemoveTag");
  }

  async globalDeleteTag(workspaceId: string, tag: string) {
    return toResult(async () => {
      await this.repo.deleteRegistryTag(workspaceId, tag);
      const contacts = await this.repo.findByTag(workspaceId, tag);
      for (const c of contacts) {
        await this.repo.setTags(
          c.id,
          workspaceId,
          (c.tags ?? []).filter((t) => t !== tag),
        );
      }
    }, "contacts.globalDeleteTag");
  }

  async globalRenameTag(workspaceId: string, oldTag: string, newTag: string) {
    return toResult(async () => {
      await this.repo.renameRegistryTag(workspaceId, oldTag, newTag);
      const contacts = await this.repo.findByTag(workspaceId, oldTag);
      for (const c of contacts) {
        const renamed = (c.tags ?? []).map((t) => (t === oldTag ? newTag : t));
        await this.repo.setTags(c.id, workspaceId, Array.from(new Set(renamed)));
      }
    }, "contacts.globalRenameTag");
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

  async createTask(workspaceId: string, contactId: string, title: string) {
    return toResult(() => this.repo.createTask(workspaceId, contactId, title), "contacts.createTask");
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