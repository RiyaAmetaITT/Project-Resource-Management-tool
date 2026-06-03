# PRM Tool — Entity-Relationship (ER) Diagram

Based on the BRD requirements, the following ER diagram models the underlying database schema necessary to support the application.

```mermaid
erDiagram
    %% Relationships
    USER ||--o| EMPLOYEE : "has profile"
    USER ||--o{ PROJECT : "manages"
    
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
        enum status "PLANNED, ACTIVE, ON_HOLD"
        enum health_status "ON_TRACK, ATTENTION, AT_RISK"
        int manager_id FK "References USER (Manager)"
    }
    
    MILESTONE {
        int id PK
        int project_id FK
        string title
        date due_date
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
        enum status "SUBMITTED"
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
1. **User vs. Employee Separation:** The `USER` table handles login credentials and roles. The `EMPLOYEE` table handles HR/work profile data. The Admin adds a User account first, then links an Employee profile to it. Admin users themselves exist in `USER` but do not need an `EMPLOYEE` record.
2. **AI Input Data Source:** The LLM's answers are fueled by joining `EMPLOYEE`, `EMPLOYEE_SKILL`, `ALLOCATION` (to calculate free capacity), and `ACTIVITY_TAG` (for recent practical skill evidence) via the `TIMESHEET_ENTRY`.
3. **System Settings:** A single-row `SYSTEM_CONFIG` table stores dynamic application settings like the LLM key and the scheduler execution interval.
