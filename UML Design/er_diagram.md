# PRM Tool — Entity-Relationship (ER) Diagram

Based on the BRD V4 requirements and the implemented MySQL schema, the following ER diagram models the underlying database structure.

```mermaid
erDiagram
    %% Relationships
    ROLE ||--o{ USER : "assigned to"
    USER ||--o| RESOURCE : "has profile"
    USER ||--o{ USER : "manages"
    USER ||--o{ PROJECT : "manages"

    RESOURCE ||--o{ USER : "reports to (manager_id)"
    RESOURCE ||--o{ RESOURCE_SKILL : "possesses"
    SKILL ||--o{ RESOURCE_SKILL : "catalogued in"
    RESOURCE ||--o{ ALLOCATION : "assigned to"
    RESOURCE ||--o{ TIMESHEET : "submits"

    PROJECT ||--o{ MILESTONE : "contains"
    PROJECT ||--o{ ALLOCATION : "requires"
    PROJECT ||--o{ TIMESHEET_ENTRY : "logged against"

    TIMESHEET ||--|{ TIMESHEET_ENTRY : "contains"
    TIMESHEET_ENTRY ||--|{ ACTIVITY_TAG : "described by"

    %% Entity Definitions
    ROLE {
        int id PK
        string name "ADMIN, MANAGER, EMPLOYEE"
    }

    USER {
        int id PK
        int role_id FK
        int manager_id FK "Nullable; self-ref to USER (Manager)"
        string username
        string password_hash
        string email
        string full_name
        string department "Nullable for ADMIN"
        string designation "Nullable for ADMIN"
        boolean force_password_change
        boolean is_active
        timestamp created_at
    }

    RESOURCE {
        int id PK
        int user_id FK "Unique; MANAGER and EMPLOYEE only"
        int manager_id FK "Nullable; synced from USER on assign"
        enum status "BENCH, ALLOCATED"
        int total_utilisation
        boolean timesheet_access_frozen
        date timesheet_frozen_week_start "Nullable"
        timestamp created_at
    }

    SKILL {
        int id PK
        string skill_name
        enum category "Backend, Frontend, DevOps, QA, Other"
    }

    RESOURCE_SKILL {
        int id PK
        int resource_id FK
        int skill_id FK
        enum proficiency_level "Beginner, Intermediate, Advanced"
    }

    PROJECT {
        int id PK
        string name
        string description
        date start_date
        date end_date
        int total_story_points
        enum status "PLANNED, ACTIVE, ON_HOLD, COMPLETED"
        enum health_status "ON_TRACK, ATTENTION, AT_RISK"
        int manager_id FK "References USER (Manager)"
        timestamp at_risk_notified_at "Nullable"
        timestamp created_at
    }

    MILESTONE {
        int id PK
        int project_id FK
        string title
        date due_date
        int story_points
        enum status "NOT_STARTED, IN_PROGRESS, DONE"
        enum health_flag "NORMAL, OVERDUE"
    }

    ALLOCATION {
        int id PK
        int resource_id FK
        int project_id FK
        int utilisation_percent
        date from_date
        date to_date
        timestamp created_at
    }

    TIMESHEET {
        int id PK
        int resource_id FK
        date week_start_date
        enum status "SUBMITTED, MISSED"
        int reminder_count
        date last_reminder_sent_at "Nullable"
        timestamp created_at
    }

    TIMESHEET_ENTRY {
        int id PK
        int timesheet_id FK
        int project_id FK
        int hours
    }

    ACTIVITY_TAG {
        int id PK
        int timesheet_entry_id FK
        string tag_name
    }

    SYSTEM_CONFIG {
        int id PK
        enum llm_provider "gemma"
        string llm_host
        string llm_model
        string llm_api_key
        int scheduler_interval_hrs
        int max_weekly_hours
    }
```

### Key Design Notes:

1. **User vs. Resource Separation:** The `USER` table holds authentication, identity (`full_name`, `email`), organisational placement (`department`, `designation`, `manager_id`), and role assignment. The `RESOURCE` table holds workforce-specific state only — allocation status, utilisation, and timesheet-access controls. Admin users exist in `USER` but do not need a `RESOURCE` record. When Admin creates a MANAGER or EMPLOYEE account, the server auto-creates a linked `RESOURCE` profile.

2. **Manager–Team Relationship:** `USER.manager_id` and `RESOURCE.manager_id` both reference a MANAGER `USER`. On assign-manager, both columns are updated. Manager-scoped queries (`findByManagerId`) filter on `RESOURCE.manager_id`.

3. **Normalised Role Lookup:** Roles are stored in a dedicated `ROLE` table. Each user has exactly one `role_id` FK.

4. **Skill Catalogue vs. Resource Proficiency:** `SKILL` is the master catalogue. `RESOURCE_SKILL` is the junction table linking a resource to a skill with a proficiency level.

5. **Timesheet Compliance:** `TIMESHEET.reminder_count` and `last_reminder_sent_at` track email reminders. `RESOURCE.timesheet_access_frozen` blocks submission after repeated misses; managers restore access via the Restore Timesheet Access screen.

6. **Project Health Notifications:** `PROJECT.at_risk_notified_at` prevents duplicate AT_RISK alert emails until health recovers.

7. **Story Points:** `PROJECT.total_story_points` and `MILESTONE.story_points` feed scheduler health rules and manager project-detail views.

8. **AI Configuration:** `SYSTEM_CONFIG` stores `llm_host`, `llm_model`, and `llm_api_key` for the unified `GemmaAIService` (Ollama-compatible or cloud OpenAI-compatible endpoints such as Groq).

### Changes from prior ER → current schema:

| Area | Before | After |
|------|--------|-------|
| `RESOURCE` | utilisation fields only | Added `manager_id`, `timesheet_access_frozen`, `timesheet_frozen_week_start` |
| `TIMESHEET` | status only | Added `reminder_count`, `last_reminder_sent_at` |
| `PROJECT` | health status only | Added `at_risk_notified_at` |
| `SYSTEM_CONFIG` | provider + API key | Added `llm_host`, `llm_model`; provider enum is `gemma` only |
| `ALLOCATION` | no audit column | Added `created_at` |
