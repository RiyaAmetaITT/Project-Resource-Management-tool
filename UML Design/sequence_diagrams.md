# PRM Tool — Consolidated Sequence Diagrams

These 6 comprehensive, role-based workflows show how the system operates end-to-end.

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
        Server-->>Console: 200 OK + JWT (+ forcePasswordChange flag)
        alt force_password_change == true (First Login / Reset)
            Console-->>User: Prompt CHANGE PASSWORD
            User->>Console: Enter new + confirm password
            Console->>Server: PUT /auth/change-password (Bearer JWT)
            Server->>Server: Validate password strength
            Server->>DB: UPDATE password_hash, force_password_change = false
            Server-->>Console: 200 OK
            Console-->>User: "Password updated. Welcome! ✓"
            Console-->>User: Route to role menu (Admin/Manager/Employee)
        else Normal Login
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
    Console->>Server: PUT /admin/employees/{id} OR GET/POST /admin/employees/{id}/skills OR GET /admin/employees/{id}/deactivate-preview
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

## 3. Manager Dashboard & Resource Allocation
Covers the team-scoped dashboard, direct allocation (with validation), and ending allocations. AI features are in Sequence 4.

```mermaid
sequenceDiagram
    actor Manager
    participant Console
    participant Server
    participant DB

    Note over Manager,DB: Resource Dashboard (team-scoped)
    Manager->>Console: Open Resource Dashboard
    Console->>Server: GET /manager/resources/dashboard
    Server->>DB: SELECT team resources WHERE manager_id = Manager
    DB-->>Server: Bench & allocated team members
    Server-->>Console: Dashboard data (bench, allocated, partialCount)
    Console-->>Manager: Display team bench & utilisation

    opt Drill into employee details
        Manager->>Console: Enter employee ID
        Console->>Server: GET /manager/resources/employees/{id}
        Server->>DB: Verify employee belongs to manager's team
        DB-->>Server: Profile, skills, allocations, recent tags
        Server-->>Console: Employee detail
        Console-->>Manager: Display detail view
    end

    Note over Manager,DB: Direct Allocation (team-scoped)
    Manager->>Console: Allocate directly — select project & employee ID
    Console->>Server: GET /manager/resources/employees/{id}
    Server-->>Console: Current utilisation & profile
    Manager->>Console: Enter utilisation %, from/to dates
    Console->>Server: POST /manager/allocations/validate
    Server->>DB: Sum overlapping utilisation for date range
    alt Total would exceed 100%
        Server-->>Console: isValid = false
        Console-->>Manager: Show validation error — adjust % or dates
    else Valid
        Server-->>Console: isValid = true + current/new totals
        Manager->>Console: Confirm allocation
        Console->>Server: POST /manager/allocations
        Server->>DB: Verify team scope + INSERT allocation
        Server->>DB: Recompute resource utilisation & status
        Server-->>Console: 201 Created
        Console-->>Manager: "Allocation saved ✓"
    end

    Note over Manager,DB: End Allocation
    Manager->>Console: Select project ID
    Console->>Server: GET /manager/projects/{projectId}/allocations
    Server-->>Console: Active allocations on project
    Manager->>Console: Select allocation & confirm end today
    Console->>Server: PUT /manager/allocations/{id}/end
    Server->>DB: UPDATE allocations SET to_date = TODAY
    Server->>DB: Recompute resource utilisation & status
    Server-->>Console: 200 OK
    Console-->>Manager: "Allocation ended ✓"
```

---

## 4. Manager AI Assistant
Covers Skill Match, Team Build, and Risk Summary. All three are read-only suggestions — the manager allocates separately via Sequence 3.

```mermaid
sequenceDiagram
    actor Manager
    participant Console
    participant Server
    participant DB
    participant LLM

    Note over Manager,LLM: Skill Match — org-wide candidates (manager must own project)
    Manager->>Console: AI Assistant → Skill Match
    Manager->>Console: Enter project ID + requirement
    Console->>Server: POST /manager/ai/skill-match {projectId, requirement}
    Server->>DB: Assert manager owns project
    Server->>DB: Load all active employees (org-wide)
    Server->>DB: Gather skills, utilisation, recent activity tags
    Server->>Server: Parse weekly hours from requirement (if present)
    Server->>Server: Filter candidates by free capacity
    alt No candidates with enough capacity
        Server-->>Console: 400 Bad Request
        Console-->>Manager: Show error — adjust requirement
    else Candidates found
        Server->>LLM: generateSkillMatch (GemmaAIService)
        LLM-->>Server: Ranked names + plain-English reasons
        Server->>Server: Drop invalid names; enrich with employeeId & availability
        Server-->>Console: Enriched match results
        Console-->>Manager: Display suggestions + verify-before-allocate note
    end

    Note over Manager,LLM: Team Build — org-wide bench only
    Manager->>Console: AI Assistant → Complete Team Building
    Manager->>Console: Describe all roles in one prompt
    Console->>Server: POST /manager/ai/team-build {requirement}
    Server->>DB: Load active BENCH employees (org-wide)
    Server->>DB: Build bench profiles with skills
    Server->>LLM: generateTeamBuild (with timeout)
    alt AI returns assignments
        LLM-->>Server: Role → employee mappings
    else AI fails or times out
        Server->>Server: Fallback — rule-based role matching
    end
    Server->>Server: Deduplicate people across roles; analyse unfilled gaps
    Server-->>Console: filled + unfilled roles (skill / availability / bench gaps)
    Console-->>Manager: Display team build results + disclaimer

    Note over Manager,LLM: Risk Summary — My Projects or AI Assistant
    Manager->>Console: Select project (from My Projects or AI Assistant)
    Console->>Server: POST /manager/ai/risk-summary {projectId}
    Server->>DB: Assert manager owns project
    Server->>DB: Gather milestones, allocations, recent hours vs expected
    Server->>LLM: generateRiskSummary
    alt LLM call succeeds
        LLM-->>Server: Markdown risk summary
    else LLM unavailable
        Server->>Server: Build rule-based fallback summary table
    end
    Server-->>Console: { summary }
    Console-->>Manager: Display risk summary + AI-generated disclaimer
```

---

## 5. Timesheets, Compliance & Project Health
Covers employees submitting timesheets (with freeze checks), managers reviewing them, and restoring frozen access.

```mermaid
sequenceDiagram
    actor Employee
    actor Manager
    participant Console
    participant Server
    participant DB

    Note over Employee,DB: Employee: Menu & Timesheet Submission
    Employee->>Console: Open Employee Menu (after login)
    Console->>Server: GET /employee/timesheets/missed-check
    Server-->>Console: hasMissedLastWeek / timesheetAccessFrozen
    Console-->>Employee: Show freeze warning or missed-week reminder

    Employee->>Console: Submit Timesheet
    Console->>Server: GET /employee/timesheets/submit-context?weekStartDate=...
    Server-->>Console: Allocations, max hours, freeze status
    alt Access frozen
        Console-->>Employee: Block submission — contact manager
    else No allocations for week
        Console-->>Employee: Block submission — no projects allocated
    else Ready to submit
        Employee->>Console: Enter hours & activity tags per project
        Console-->>Employee: Show summary (total vs max weekly hours)
        Employee->>Console: Confirm submit [S]
        Console->>Server: POST /employee/timesheets {weekStartDate, entries}
        Server->>Server: Validate hours ≤ max, no future week, not frozen
        Server->>DB: INSERT timesheet, entries & activity tags
        Server-->>Console: 201 Created
        Console-->>Employee: "Timesheet SUBMITTED ✓"
    end

    Note over Manager,DB: Manager: Review Team Timesheets
    Manager->>Console: Open Timesheets (optional week filter)
    Console->>Server: GET /manager/timesheets?week=...
    Server->>DB: SELECT team timesheets WHERE manager_id = Manager
    Server-->>Console: Rows with SUBMITTED / MISSED status
    Console-->>Manager: Display team timesheet table

    opt View employee week detail
        Manager->>Console: [V] View detail — enter employee ID if needed
        Console->>Server: GET /manager/timesheets/detail?employeeId=&week=...
        Server-->>Console: Entries, activity tags, total hours
        Console-->>Manager: Display week detail
    end

    Note over Manager,DB: Manager: Restore Frozen Access
    Manager->>Console: Restore Timesheet Access
    Console->>Server: GET /manager/timesheets/frozen-employees
    Server-->>Console: Frozen team members list
    Manager->>Console: Select employee to restore
    Console->>Server: PUT /manager/resources/employees/{id}/restore-timesheet-access
    Server->>DB: UPDATE resources SET timesheet_access_frozen = FALSE
    Server-->>Console: 200 OK
    Console-->>Manager: "Timesheet access restored ✓"

    Note over Manager,DB: Manager: Project Health (non-AI)
    Manager->>Console: My Projects → select project
    Console->>Server: GET /manager/projects/{id}/detail
    Server-->>Console: Health status, risk flags, milestones, allocations
    Console-->>Manager: Display project detail (AI risk summary is Sequence 4)
```

---

## 6. Background Scheduler
The automated backend process that keeps system state accurate and sends notifications.

```mermaid
sequenceDiagram
    participant Scheduler
    participant DB
    participant Email

    loop Every N hours (configurable via system_config)
        Scheduler->>Scheduler: Wake up (node-cron worker thread)

        Note over Scheduler,DB: Step 1: Resource Utilisation
        Scheduler->>DB: SELECT all active resources
        Scheduler->>Scheduler: Sum today's overlapping utilisation % per resource
        Scheduler->>DB: UPDATE total_utilisation; set status BENCH or ALLOCATED

        Note over Scheduler,DB: Step 2: Flag Missed Timesheets
        Scheduler->>DB: For past allocated weeks without submission, INSERT status = MISSED

        Note over Scheduler,Email: Step 3: Timesheet Email Reminders & Freeze
        Scheduler->>Scheduler: On working days only — compare today to deadline calendar
        Scheduler->>DB: Find allocated employees with unsubmitted last-week timesheet
        alt Today = 1st working day after deadline
            Scheduler->>Email: Send reminder 1 to employee
            Scheduler->>DB: UPDATE reminder_count = 1 on timesheet
        else Today = 2nd working day after deadline
            Scheduler->>Email: Send reminder 2 to employee
            Scheduler->>DB: UPDATE reminder_count = 2 on timesheet
        else Today = 3rd working day after deadline
            Scheduler->>DB: SET timesheet_access_frozen = TRUE on resource
            Scheduler->>Email: Notify employee + manager of freeze
        end

        Note over Scheduler,DB: Step 4: Flag Overdue Milestones
        Scheduler->>DB: SELECT milestones WHERE due_date < today AND status != DONE
        Scheduler->>DB: UPDATE milestone SET health_flag = OVERDUE

        Note over Scheduler,Email: Step 5: Compute Project Health & Notify
        Scheduler->>DB: SELECT projects, milestones, last-week timesheet stats
        Scheduler->>Scheduler: Apply health rules (overdue milestones, hours, story points)
        alt Milestone overdue OR hours/SP critical
            Scheduler->>DB: UPDATE health_status = AT_RISK
            opt First AT_RISK transition (at_risk_notified_at is null)
                Scheduler->>Email: Send project health alert to manager
                Scheduler->>DB: SET at_risk_notified_at
            end
        else Milestone approaching OR hours/SP low
            Scheduler->>DB: UPDATE health_status = ATTENTION
        else On time & expected progress
            Scheduler->>DB: UPDATE health_status = ON_TRACK
            Scheduler->>DB: CLEAR at_risk_notified_at if health recovered
        end

        Scheduler->>Scheduler: Sleep until next interval
    end
```

### Changes from prior diagrams → current implementation:
- **Sequence 1:** JWT is always issued on valid login; change-password uses Bearer token.
- **Sequence 2:** Skills management uses GET/POST on `/admin/employees/{id}/skills`; deactivate uses preview then confirm.
- **Sequence 3:** Dashboard, direct allocation, and end allocation only — team-scoped; validate before POST.
- **Sequence 4:** New — AI Skill Match (org-wide), Team Build (bench + fallback), Risk Summary (with LLM fallback); no allocation step.
- **Sequence 5:** Employee missed-check on menu load; submit-context freeze guard; manager timesheet detail endpoint; scheduler removed from this diagram.
- **Sequence 6:** Reminder/freeze tied to working days after deadline; clears `at_risk_notified_at` when health recovers.
