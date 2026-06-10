# PRM Tool — Entity-Relationship (ER) Diagram

Based on the BRD V4 requirements, the following ER diagram models the underlying database schema necessary to support the application.

```mermaid
erDiagram
    %% Relationships
    USER ||--o| EMPLOYEE : "has profile"
    USER ||--o{ PROJECT : "manages"
    USER ||--o{ EMPLOYEE : "is manager of"
    
    EMPLOYEE ||--o{ EMPLOYEE_SKILL : "possesses"
    EMPLOYEE ||--o{ ALLOCATION : "assigned to"
    EMPLOYEE ||--o{ TIMESHEET : "submits"
    
    PROJECT ||--o{ MILESTONE : "contains"
    PROJECT ||--o{ ALLOCATION : "requires"
    PROJECT ||--o{ TIMESHEET_ENTRY : "logged against"
    
    TIMESHEET ||--|{ TIMESHEET_ENTRY : "contains"
    TIMESHEET_ENTRY ||--|{ ACTIVITY_TAG : "described by"
    
    %% Entity Definitions
    USER {
        int id PK
        string username
        string password_hash
        string email
        string full_name
        enum role "ADMIN, MANAGER, EMPLOYEE"
        boolean force_password_change
        boolean is_active
    }
    
    EMPLOYEE {
        int id PK
        int user_id FK "Nullable for system Admins"
        int manager_id FK "References USER (Manager role) — NEW in V4"
        string name
        string email
        string department
        string designation
        enum status "BENCH, ALLOCATED"
        int total_utilisation
        boolean is_active
    }
    
    EMPLOYEE_SKILL {
        int id PK
        int employee_id FK
        string skill_name
        string category
        enum proficiency_level "Beginner, Intermediate, Advanced"
    }
    
    PROJECT {
        int id PK
        string name
        string description
        date start_date
        date end_date
        int total_story_points "NEW in V4"
        enum status "PLANNED, ACTIVE, ON_HOLD, COMPLETED"
        enum health_status "ON_TRACK, ATTENTION, AT_RISK"
        int manager_id FK "References USER (Manager)"
    }
    
    MILESTONE {
        int id PK
        int project_id FK
        string title
        date due_date
        int story_points "NEW in V4"
        enum status "NOT_STARTED, IN_PROGRESS, DONE"
        enum health_flag "NORMAL, OVERDUE"
    }
    
    ALLOCATION {
        int id PK
        int employee_id FK
        int project_id FK
        int utilisation_percent
        date from_date
        date to_date
    }
    
    TIMESHEET {
        int id PK
        int employee_id FK
        date week_start_date
        enum status "SUBMITTED, MISSED"
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
        string llm_provider
        string llm_api_key
        int scheduler_interval_hrs
        int max_weekly_hours
    }
```

### Key Design Notes:
1. **User vs. Employee Separation:** The `USER` table handles login credentials and roles. The `EMPLOYEE` table handles HR/work profile data. In V4, Admin creates a User account (Screen 3.4.1) and the server auto-creates an employee profile for MANAGER and EMPLOYEE roles; Admin then updates the profile and assigns a manager (Screen 3.1.4). Admin users exist in `USER` but do not need an `EMPLOYEE` record.
2. **Manager-Employee Relationship (V4 NEW):** `EMPLOYEE` now has a `manager_id` FK referencing `USER`. This enables the manager-scoped visibility on the Resource Dashboard and Allocate Resource screens — managers only see employees under their own team.
3. **Story Points (V4 NEW):** `PROJECT` gains a `total_story_points` field, and `MILESTONE` gains a `story_points` field. These are displayed in Screen 3.2.2 (View All Projects) and Screen 3.2.4 (Manage Milestones) to track project progress.
4. **Project Status `COMPLETED` (V4 NEW):** The `PROJECT.status` enum now includes a `COMPLETED` value visible in Screen 3.2.3 (Update Project Details).
5. **AI Input Data Source:** The LLM's answers are fuelled by joining `EMPLOYEE`, `EMPLOYEE_SKILL`, `ALLOCATION` (to calculate free capacity), and `ACTIVITY_TAG` (for recent practical skill evidence) via the `TIMESHEET_ENTRY`.
6. **System Settings:** A single-row `SYSTEM_CONFIG` table stores dynamic application settings like the LLM key and the scheduler execution interval.

### Changes from V3 → V4:
- **EMPLOYEE**: Added `manager_id FK` (references `USER`) — required for manager-scoped team visibility.
- **PROJECT**: Added `total_story_points INT` field; added `COMPLETED` to the `status` enum.
- **MILESTONE**: Added `story_points INT` field.
- **USER → EMPLOYEE**: Added new "is manager of" relationship line to reflect the `manager_id` FK.
