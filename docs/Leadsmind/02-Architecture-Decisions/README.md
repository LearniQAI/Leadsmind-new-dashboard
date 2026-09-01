---
type: index
---

# Architecture Decisions

Lightweight ADR log — one note per explicit decision made during the build,
using the [[Architecture-Decision]] template (Context → Options Considered →
Decision Made → Reasoning). Numbered sequentially; never renumbered. A
superseded ADR stays in place with `status: superseded` and a link forward.

| ADR | Decision | Status |
|---|---|---|
| [[ADR-0001-module-quiz-separate-tables]] | Module quizzes get their own tables, not a nullable `module_id` on the lesson-quiz tables | accepted |
| [[ADR-0002-quiz-attempt-fk-set-null]] | Quiz-attempt FKs use `ON DELETE SET NULL`, not `CASCADE` | accepted |
| [[ADR-0003-custom-domain-course-serving]] | Custom-domain course lookup scopes by `domain_configurations.id`, not `workspace_id` | accepted |
| [[ADR-0004-sender-domains-vs-custom-domains]] | Sender Domains and Custom Domain Connection stay separate; only the auth posture was unified | accepted |
| [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]] | Drop only the confirmed-dead legacy quiz children now; `lms_quizzes` left for a separate decision | accepted |
| [[ADR-0006-smart-tags-relational-model]] | Replace the never-created `contact_tags_registry` with a hierarchical, polymorphic tag model | accepted |
