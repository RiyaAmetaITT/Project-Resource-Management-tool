# PRM Tool — Use Case Diagram

The following diagram maps out the primary actors (Admin, Manager, and Employee) and the specific use cases they interact with inside the system boundary. It uses standard `<<includes>>` and `<<extends>>` terminology where applicable.

```mermaid
flowchart LR
    %% Actors
    Admin(("Admin"))
    Manager(("Manager"))
    Employee(("Employee"))

    %% System Boundary
    subgraph PRM [Project & Resource Management System]
        direction TB

        %% General Authentication
        UC_Login(Login & Authenticate)
        UC_Pwd(Change Password on First Login)

        %% Admin Cases
        UC_ManageUsers(Manage User Accounts)
        UC_Reactivate(Reactivate User Account)
        UC_ManageEmp(Manage Employee Profiles)
        UC_AssignMgr(Assign Manager to Employee)
        UC_ManageSkills(Manage Employee Skills)
        UC_ManageProj(Create & Manage Projects & Milestones)
        UC_ViewAlloc(View All Allocations)
        UC_SysConfig(System Configuration)

        %% Manager Cases
        UC_Dashboard(View Resource Dashboard)
        UC_Allocate(Allocate Resource to Project)
        UC_EndAlloc(End Resource Allocation)
        UC_AISkill(Find Resource via AI Skill Match)
        UC_TeamBuild(Complete Team Building via AI)
        UC_MyProj(View My Projects Health)
        UC_AIRisk(Generate AI Risk Summary)
        UC_TeamTS(View Team Timesheets)
        UC_RestoreTS(Restore Timesheet Access)

        %% Employee Cases
        UC_SubmitTS(Submit Weekly Timesheet)
        UC_MyTS(View My Timesheets)
        UC_MyAlloc(View My Allocations)
    end

    %% Shared Connections
    Admin --> UC_Login
    Manager --> UC_Login
    Employee --> UC_Login

    UC_Login -. "<<includes>>" .-> UC_Pwd

    %% Admin Connections
    Admin --> UC_ManageUsers
    Admin --> UC_ManageEmp
    Admin --> UC_AssignMgr
    Admin --> UC_ManageSkills
    Admin --> UC_ManageProj
    Admin --> UC_ViewAlloc
    Admin --> UC_SysConfig
    UC_ManageUsers -. "<<extends>>" .-> UC_Reactivate

    %% Manager Connections
    Manager --> UC_Dashboard
    Manager --> UC_Allocate
    Manager --> UC_EndAlloc
    Manager --> UC_MyProj
    Manager --> UC_TeamTS
    Manager --> UC_RestoreTS

    %% Manager AI Extensions
    UC_Allocate -. "<<extends>>" .-> UC_AISkill
    UC_MyProj -. "<<extends>>" .-> UC_AIRisk
    UC_AISkill -. "<<extends>>" .-> UC_TeamBuild

    %% Employee Connections
    Employee --> UC_SubmitTS
    Employee --> UC_MyTS
    Employee --> UC_MyAlloc

    %% Styling
    classDef actor fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000,shape:circle
    classDef usecase fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000,shape:stadium
    classDef system fill:none,stroke:#333,stroke-width:3px,stroke-dasharray: 5 5

    class Admin,Manager,Employee actor
    class UC_Login,UC_Pwd,UC_ManageUsers,UC_Reactivate,UC_ManageEmp,UC_AssignMgr,UC_ManageSkills,UC_ManageProj,UC_ViewAlloc,UC_SysConfig,UC_Dashboard,UC_Allocate,UC_EndAlloc,UC_AISkill,UC_TeamBuild,UC_MyProj,UC_AIRisk,UC_TeamTS,UC_RestoreTS,UC_SubmitTS,UC_MyTS,UC_MyAlloc usecase
    class PRM system
```

### Explanation of Use Case Relationships:

1. **`<<includes>>`**: The `Login & Authenticate` use case _includes_ `Change Password on First Login` because the system enforces this flow automatically if the `force_password_change` flag is true.
2. **`<<extends>>`**: `Find Resource via AI Skill Match` _extends_ the `Allocate Resource` use case, meaning it is an optional AI-driven path the manager can take to accomplish allocation.
3. **`<<extends>>`**: `Generate AI Risk Summary` _extends_ the `View My Projects Health` use case, as it is an optional analytical tool triggered while viewing project details.
4. **`<<extends>>`**: `Reactivate User Account` _extends_ `Manage User Accounts` — available from View All Users for inactive accounts.
5. **`<<extends>>`**: `Complete Team Building via AI` _extends_ AI skill matching — available from the AI Assistant menu (`POST /manager/ai/team-build`).
6. **`Restore Timesheet Access`**: Manager unfreezes an employee whose timesheet submission was blocked after missed deadlines and reminders.

### Changes from prior diagram → current implementation:
- **Added** `UC_Reactivate`, `UC_ViewAlloc`, `UC_RestoreTS`, `UC_TeamBuild`.
- **Manager visibility:** Dashboard, allocation, and timesheet use cases remain scoped to the manager's team (`RESOURCE.manager_id`).
- **Terminology:** Domain entity is `Resource`; UI and API DTOs still refer to "employee" for workforce members.
