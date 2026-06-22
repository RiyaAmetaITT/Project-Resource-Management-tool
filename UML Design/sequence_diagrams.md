# PRM Tool — Consolidated Sequence Diagrams

These 5 comprehensive, role-based workflows show how the system operates end-to-end.

---

## 1. Authentication & User Management
Covers Admin creating/resetting/reactivating users, assigning managers, and the User login flow (including the forced password change on first login).

```mermaid
sequenceDiagram
    actor Admin
    actor User
    participant Console
    participant Server
    participant DB

    Note over Admin,DB: Admin: User Setup & Maintenance
    Admin->>Console: Create User Account OR Reset Password
    Console->>Server: POST /admin/users OR PUT /admin/users/{id}/reset-password
    Server->>DB: INSERT user (+ resource profile for MANAGER/EMPLOYEE) OR UPDATE password (force_password_change = true)
    DB-->>Server: OK
    Server-->>Console: Success
    Console-->>Admin: "Account created / Password reset. ✓"

    Note over Admin,DB: Admin: Reactivate User (View All Users)
    Admin->>Console: View All Users → Reactivate inactive account
    Console->>Server: PUT /admin/users/{id}/reactivate
    Server->>DB: UPDATE users SET is_active = TRUE
    DB-->>Server: OK
    Server-->>Console: 200 OK
    Console-->>Admin: "Account reactivated. ✓"

    Note over Admin,DB: Admin: Assign Manager to Employee
    Admin->>Console: Assign Manager (Screen 3.1.4)
    Console->>Server: PUT /admin/employees/assign-manager {employeeUserId, managerId}
    Server->>DB: UPDATE users SET manager_id = managerId WHERE id = employeeUserId
    Server->>DB: UPDATE resources SET manager_id = managerId WHERE user_id = employeeUserId
    DB-->>Server: OK
    Server-->>Console: 200 OK
    Console-->>Admin: "Manager assigned. ✓"

    Note over User,DB: User: Login Flow
    User->>Console: Enter credentials
    Console->>Server: POST /auth/login
    Server->>DB: SELECT user
    DB-->>Server: User record
    Server->>Server: Validate password

    alt Invalid Credentials
        Server-->>Console: 401 Unauthorized
        Console-->>User: "Invalid username or password"
    else Valid Credentials
        alt force_password_change == true (First Login / Reset)
            Server-->>Console: 200 OK + force_change flag
            Console-->>User: Prompt CHANGE PASSWORD
            User->>Console: Enter new password
            Console->>Server: PUT /auth/change-password
            Server->>Server: Validate password strength
            Server->>DB: UPDATE password_hash, force_password_change = false
            Server-->>Console: 200 OK
            Console-->>User: "Password updated. Welcome! ✓"
        else Normal Login
            Server-->>Console: 200 OK + JWT
            Console-->>User: Route to role menu (Admin/Manager/Employee)
        end
    end
```

---

## 2. Core Admin Setup
Covers administrative tasks: managing employees (with deactivate preview), skills, projects (with story points), and system configuration.

```mermaid
sequenceDiagram
    actor Admin
    participant Console
    participant Server
    participant DB

    Note over Admin,DB: Employee & Skill Management
    Admin->>Console: Update Employee / Manage Skills / Deactivate Employee
    Console->>Server: PUT /admin/employees/{id} OR POST /admin/employees/{id}/skills OR GET /admin/employees/{id}/deactivate-preview
    alt Deactivate Employee
        Server-->>Console: Preview (active allocations list)
        Admin->>Console: Confirm deactivation
        Console->>Server: PUT /admin/employees/{id}/deactivate
        Server->>DB: End active allocations, set resource BENCH, set user inactive
    else Update / Skills
        Server->>DB: UPDATE users / INSERT resource_skills
    end
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: Action confirmed

    Note over Admin,DB: Project Setup (with Story Points)
    Admin->>Console: Create Project (name, dates, status, managerId, totalStoryPoints)
    Console->>Server: POST /admin/projects
    Server->>DB: INSERT INTO projects (including total_story_points)
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: Action confirmed

    Note over Admin,DB: Milestone Management (with Story Points)
    Admin->>Console: Add Milestone (title, dueDate, storyPoints)
    Console->>Server: POST /admin/projects/{id}/milestones
    Server->>DB: INSERT INTO milestones (including story_points)
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: "Milestone added. ✓"

    Note over Admin,DB: System Configuration
    Admin->>Console: Update Config (LLM host/model/key, scheduler interval, max hours)
    Console->>Server: PUT /admin/config
    Server->>DB: UPDATE system_config
    DB-->>Server: OK
    Server-->>Console: 200 OK
    Console-->>Admin: "Settings updated. ✓"
```

---

## 3. Manager Resource Allocation (incl. AI)
Covers viewing the team-scoped dashboard, finding resources (via AI or direct), validating utilisation, and executing the allocation.

```mermaid
sequenceDiagram
    actor Manager
    participant Console
    participant Server
    participant DB
    participant LLM

    Manager->>Console: View Resource Dashboard
    Console->>Server: GET /manager/resources/dashboard
    Server->>DB: SELECT resources WHERE manager_id = Manager (team-scoped)
    DB-->>Server: Bench & Allocated team members
    Server-->>Console: Dashboard Data
    Console-->>Manager: Display Dashboard (team members only)

    Note over Manager,LLM: Allocation Options

    alt AI-Assisted Allocation
        Manager->>Console: Describe requirement in plain English
        Console->>Server: POST /manager/ai/skill-match {projectId, requirement}
        Server->>DB: Get team candidates with free capacity
        Server->>LLM: Send requirement + candidate summaries (GemmaAIService)
        LLM-->>Server: Ranked list with plain-English reasons
        Server-->>Console: AI Match Results
        Console-->>Manager: Display AI suggestions
    else Direct Allocation
        Manager->>Console: Select Employee ID (must be in their team)
        Console->>Server: POST /manager/allocations/validate
        Server-->>Console: Current vs new utilisation %
    else End Allocation
        Manager->>Console: End existing allocation on their project
        Console->>Server: PUT /manager/allocations/{id}/end
        Server->>DB: UPDATE allocations SET to_date = TODAY
        Server->>DB: Recompute resource utilisation & status
        Server-->>Console: Success
    end

    opt Confirming a New Allocation
        Manager->>Console: Enter %, Dates & Confirm
        Console->>Server: POST /manager/allocations
        Server->>DB: Verify overlapping utilisation
        alt Over-allocated (>100%)
            Server-->>Console: 400 Bad Request
            Console-->>Manager: "⚠ Validation Error: Over-allocated"
        else Valid
            Server->>DB: INSERT INTO allocations
            Server-->>Console: 201 Created
            Console-->>Manager: "Allocation saved ✓"
        end
    end
```

---

## 4. Timesheets, Compliance & Project Health
Covers employees submitting timesheets (with freeze checks), managers reviewing them, restoring frozen access, and AI project health analysis.

```mermaid
sequenceDiagram
    actor Employee
    actor Manager
    participant Console
    participant Server
    participant DB
    participant LLM
    participant Email

    Note over Employee,DB: Employee: Timesheet Management
    Employee->>Console: Login
    Console->>Server: GET /employee/timesheets/missed-check
    Server-->>Console: hasMissedLastWeek / timesheetAccessFrozen
    Console-->>Employee: Show reminder or freeze warning on menu

    Employee->>Console: Submit Timesheet (Screen 5.1)
    Console->>Server: GET /employee/timesheets/submit-context
    Server-->>Console: Projects & expected hours max
    Employee->>Console: Enter hours & activity tags per project
    Console-->>Employee: Show Summary (total hours vs max)
    Employee->>Console: Confirm & Submit
    Console->>Server: POST /employee/timesheets
    Server->>Server: Validate hours <= max, no future week, not frozen
    Server->>DB: INSERT timesheet, entries & activity tags
    Server-->>Console: 201 Created
    Console-->>Employee: "Timesheet SUBMITTED ✓"

    Note over Manager,DB: Manager: Review Timesheets & Restore Access
    Manager->>Console: View Team Timesheets (filtered to own team)
    Console->>Server: GET /manager/timesheets
    Server->>DB: SELECT team timesheets WHERE manager_id = Manager (flag MISSED)
    Server-->>Console: Timesheet summary
    Console-->>Manager: Show SUBMITTED/MISSED status

    opt Restore Frozen Employee
        Manager->>Console: Restore Timesheet Access
        Console->>Server: GET /manager/timesheets/frozen-employees
        Manager->>Console: Select employee to restore
        Console->>Server: PUT /manager/resources/employees/{id}/restore-timesheet-access
        Server->>DB: UPDATE resources SET timesheet_access_frozen = FALSE
        Server-->>Console: 200 OK
    end

    Note over Manager,LLM: Manager: Project Health
    Manager->>Console: View Project Details (Screen 4.3)
    Console->>Server: GET /manager/projects/{id}/detail
    Server-->>Console: Project health, risk flags, milestones (SP done/total), allocated resources

    opt Request AI Risk Summary
        Manager->>Console: Get AI Risk Summary
        Console->>Server: POST /manager/ai/risk-summary {projectId}
        Server->>DB: Gather facts (milestones, logged vs expected hrs)
        Server->>LLM: Generate plain-English risk text
        LLM-->>Server: Risk summary paragraph
        Server-->>Console: AI Risk Summary
        Console-->>Manager: Display generated paragraph
    end

    Note over Server,Email: Scheduler: Timesheet Reminders (background)
    Server->>DB: Flag missed timesheets for allocated employees
    Server->>Email: Send reminder emails (day 1, day 2 after deadline)
    Server->>DB: Freeze timesheet access after 2nd reminder
```

---

## 5. Background Scheduler
The automated backend process that keeps system state accurate and sends notifications.

```mermaid
sequenceDiagram
    participant Scheduler
    participant DB
    participant Email

    loop Every N hours (Configurable)
        Scheduler->>Scheduler: Wake up (node-cron)

        Note over Scheduler,DB: Step 1: Resource Utilisation
        Scheduler->>DB: SELECT active allocations
        Scheduler->>Scheduler: Sum overlapping utilisation % per resource
        Scheduler->>DB: UPDATE total_utilisation, set status (BENCH / ALLOCATED)

        Note over Scheduler,DB: Step 2: Flag Missed Timesheets
        Scheduler->>DB: For past weeks with allocation but no submission, INSERT status = MISSED

        Note over Scheduler,Email: Step 3: Timesheet Email Reminders
        Scheduler->>DB: Find employees past deadline without submission
        Scheduler->>Email: Send reminder 1 / reminder 2
        Scheduler->>DB: Increment reminder_count; freeze access after 2nd reminder

        Note over Scheduler,DB: Step 4: Flag Overdue Milestones
        Scheduler->>DB: SELECT milestones WHERE due_date < today AND status != DONE
        Scheduler->>DB: UPDATE milestone SET health_flag = OVERDUE

        Note over Scheduler,Email: Step 5: Compute Project Health & Notify
        Scheduler->>DB: SELECT projects, milestones (SP done vs total), timesheet stats
        Scheduler->>Scheduler: Apply Health Rules (hours + story points + milestones)
        alt Milestone overdue OR hours/SP critical
            Scheduler->>DB: UPDATE health_status = AT_RISK
            opt First AT_RISK transition
                Scheduler->>Email: Send project health alert to manager
                Scheduler->>DB: SET at_risk_notified_at
            end
        else Milestone approaching OR hours/SP low
            Scheduler->>DB: UPDATE health_status = ATTENTION
        else On time & expected progress
            Scheduler->>DB: UPDATE health_status = ON_TRACK
        end

        Scheduler->>Scheduler: Sleep until next interval
    end
```

### Changes from prior diagrams → current implementation:
- **Sequence 1:** Added reactivate-user flow; assign-manager now updates both `users` and `resources`.
- **Sequence 2:** Deactivate employee uses deactivate-preview; skills route is `/admin/employees/{id}/skills`; system config includes `llm_host` and `llm_model`.
- **Sequence 3:** Utilisation check uses `POST /manager/allocations/validate`; AI calls go through `GemmaAIService`.
- **Sequence 4:** Added missed-check and submit-context endpoints; timesheet freeze and manager restore-access flow; scheduler reminder emails.
- **Sequence 5:** Expanded to five steps: utilisation, missed flagging, email reminders/freeze, overdue milestones, health computation with AT_RISK email notifications.
