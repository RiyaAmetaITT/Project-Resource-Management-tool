# PRM Tool — Consolidated Sequence Diagrams

These 5 comprehensive, role-based workflows show how the system operates end-to-end.

---

## 1. Authentication & User Management
Covers Admin creating/resetting users, assigning managers, and the User login flow (including the forced password change on first login).

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
    Server->>DB: INSERT user (+ employee profile for MANAGER/EMPLOYEE) OR UPDATE password (force_password_change = true)
    DB-->>Server: OK
    Server-->>Console: Success
    Console-->>Admin: "Account created / Password reset. ✓"

    Note over Admin,DB: Admin: Assign Manager to Employee (V4)
    Admin->>Console: Assign Manager (Screen 3.1.4)
    Console->>Server: PUT /admin/employees/assign-manager {employeeUserId, managerId}
    Server->>DB: UPDATE employee SET manager_id = managerId WHERE user_id = employeeUserId
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
Covers all standard administrative tasks: managing employees, skills, projects (with story points), and system configuration.

```mermaid
sequenceDiagram
    actor Admin
    participant Console
    participant Server
    participant DB

    Note over Admin,DB: Employee & Skill Management
    Admin->>Console: Update Employee / Manage Skills / Deactivate Employee
    Console->>Server: PUT /admin/employees/{id} OR /skills OR /deactivate
    Server->>DB: UPDATE employees & skills
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: Action confirmed

    Note over Admin,DB: Project Setup (with Story Points — NEW V4)
    Admin->>Console: Create Project (name, dates, status, managerId, totalStoryPoints)
    Console->>Server: POST /admin/projects
    Server->>DB: INSERT INTO projects (including total_story_points)
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: Action confirmed

    Note over Admin,DB: Milestone Management (with Story Points — NEW V4)
    Admin->>Console: Add Milestone (title, dueDate, storyPoints)
    Console->>Server: POST /admin/projects/{id}/milestones
    Server->>DB: INSERT INTO milestones (including story_points)
    DB-->>Server: OK
    Server-->>Console: Success response
    Console-->>Admin: "Milestone added. ✓"

    Note over Admin,DB: System Configuration
    Admin->>Console: Update Config (e.g., LLM Key, Max Hours)
    Console->>Server: PUT /admin/config
    Server->>DB: UPDATE system_config
    DB-->>Server: OK
    Server-->>Console: 200 OK
    Console-->>Admin: "Settings updated. ✓"
```

---

## 3. Manager Resource Allocation (incl. AI)
Covers viewing the team-scoped dashboard, finding resources (via AI or direct), and executing the allocation.

```mermaid
sequenceDiagram
    actor Manager
    participant Console
    participant Server
    participant DB
    participant LLM

    Manager->>Console: View Resource Dashboard
    Console->>Server: GET /manager/resources/dashboard
    Server->>DB: SELECT Bench & Allocated employees WHERE manager_id = Manager
    DB-->>Server: Data (team-scoped)
    Server-->>Console: Dashboard Data
    Console-->>Manager: Display Dashboard (team members only)

    Note over Manager,LLM: Allocation Options

    alt AI-Assisted Allocation
        Manager->>Console: Describe requirement in plain English
        Console->>Server: POST /manager/ai/skill-match
        Server->>DB: Get team candidates with free capacity
        Server->>LLM: Send requirement + candidate summaries
        LLM-->>Server: Ranked list with plain-English reasons
        Server-->>Console: AI Match Results
        Console-->>Manager: Display AI suggestions
    else Direct Allocation
        Manager->>Console: Select Employee ID (must be in their team)
        Console->>Server: GET /manager/employees/{id}/utilisation
        Server-->>Console: Current utilisation %
    else End Allocation
        Manager->>Console: End existing allocation on their project
        Console->>Server: PUT /manager/allocations/{id}/end
        Server->>DB: UPDATE allocations SET to_date = TODAY
        Server->>DB: Recompute employee utilisation & status
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

## 4. Timesheets & Project Health
Covers employees submitting timesheets and managers reviewing them alongside project health metrics via AI.

```mermaid
sequenceDiagram
    actor Employee
    actor Manager
    participant Console
    participant Server
    participant DB
    participant LLM

    Note over Employee,DB: Employee: Timesheet Management
    Employee->>Console: Login
    Console->>Server: Check for missed timesheets
    Server-->>Console: status (MISSED / SUBMITTED)
    Console-->>Employee: Show reminder if missed

    Employee->>Console: Submit Timesheet (Screen 5.1)
    Console->>Server: GET active allocations
    Server-->>Console: Projects & expected hours max
    Employee->>Console: Enter hours & activity tags per project
    Console-->>Employee: Show Summary (total hours vs max)
    Employee->>Console: Confirm & Submit
    Console->>Server: POST /employee/timesheets
    Server->>Server: Validate hours <= allocated max & no future week
    Server->>DB: INSERT timesheet, entries & activity tags
    Server-->>Console: 201 Created
    Console-->>Employee: "Timesheet SUBMITTED ✓"

    Note over Manager,LLM: Manager: Review & Project Health
    Manager->>Console: View Team Timesheets (filtered to own team)
    Console->>Server: GET /manager/timesheets
    Server->>DB: SELECT team timesheets WHERE manager_id = Manager (flag MISSED)
    Server-->>Console: Timesheet summary
    Console-->>Manager: Show SUBMITTED/MISSED status

    Manager->>Console: View Project Details (Screen 4.3)
    Console->>Server: GET /manager/projects/{id}/detail
    Server-->>Console: Project health, risk flags, milestones (SP done/total), allocated resources

    opt Request AI Risk Summary
        Manager->>Console: Get AI Risk Summary
        Console->>Server: POST /manager/ai/risk-summary
        Server->>DB: Gather facts (milestones, logged vs expected hrs)
        Server->>LLM: Generate plain-English risk text
        LLM-->>Server: Risk summary paragraph
        Server-->>Console: AI Risk Summary
        Console-->>Manager: Display generated paragraph
    end
```

---

## 5. Background Scheduler
The automated backend process that keeps the system state accurate without user intervention.

```mermaid
sequenceDiagram
    participant Scheduler
    participant DB

    loop Every N hours (Configurable)
        Scheduler->>Scheduler: Wake up

        Note over Scheduler,DB: Step 1: Employee Utilisation
        Scheduler->>DB: SELECT active allocations
        Scheduler->>Scheduler: Sum overlapping utilisation % per employee
        Scheduler->>DB: UPDATE total_utilisation, set status (BENCH / ALLOCATED)

        Note over Scheduler,DB: Step 2: Flag Overdue Milestones
        Scheduler->>DB: SELECT milestones WHERE due_date < today AND status != DONE
        Scheduler->>DB: UPDATE milestone SET health_flag = OVERDUE

        Note over Scheduler,DB: Step 3: Compute Project Health
        Scheduler->>DB: SELECT projects, milestones (SP done vs total), timesheet stats
        Scheduler->>Scheduler: Apply Health Rules
        alt Milestone overdue OR hours critical
            Scheduler->>DB: UPDATE health_status = AT RISK
        else Milestone approaching OR hours low
            Scheduler->>DB: UPDATE health_status = ATTENTION
        else On time & expected hours
            Scheduler->>DB: UPDATE health_status = ON TRACK
        end

        Scheduler->>Scheduler: Sleep until next interval
    end
```

### Changes from V3 → V4:
- **Sequence 1**: Added "Assign Manager" interaction (new Screen 3.1.4 flow).
- **Sequence 2**: Updated Project creation to include `totalStoryPoints`; updated Milestone creation to include `storyPoints`.
- **Sequence 3**: Dashboard and allocation candidate queries now scoped to `manager_id`. End allocation now also recomputes employee status.
- **Sequence 4**: Added "Show Summary" step before submit in Employee timesheet flow. Manager timesheets view now also scoped to team. Project detail response now includes risk flags and SP progress.
- **Sequence 5**: Scheduler Step 3 DB query now includes milestone story points for SP-based health computation.
