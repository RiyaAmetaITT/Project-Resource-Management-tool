# PRM Tool — Use Case Diagram

The following diagram maps out the primary actors (Admin, Manager, and Employee) and the specific use cases they interact with inside the system boundary. It uses standard `<<includes>>` and `<<extends>>` terminology where applicable.

```mermaid
flowchart LR
    %% Actors
    Admin(("Admin 🛠️"))
    Manager(("Manager 👔"))
    Employee(("Employee 👷"))

    %% System Boundary
    subgraph PRM [Project & Resource Management System]
        direction TB
        
        %% General Authentication
        UC_Login(Login & Authenticate)
        UC_Pwd(Change Password on First Login)
        
        %% Admin Cases
        UC_ManageUsers(Manage User Accounts)
        UC_ManageEmp(Manage Employee Profiles)
        UC_ManageSkills(Manage Employee Skills)
        UC_ManageProj(Create Projects & Milestones)
        UC_SysConfig(System Configuration)
        
        %% Manager Cases
        UC_Dashboard(View Resource Dashboard)
        UC_Allocate(Allocate Resource to Project)
        UC_EndAlloc(End Resource Allocation)
        UC_AISkill(Find Resource via AI Skill Match)
        UC_MyProj(View My Projects Health)
        UC_AIRisk(Generate AI Risk Summary)
        UC_TeamTS(View Team Timesheets)
        
        %% Employee Cases
        UC_SubmitTS(Submit Weekly Timesheet)
        UC_MyTS(View My Timesheets)
        UC_MyAlloc(View My Allocations)
    end

    %% Shared Connections
    Admin ---> UC_Login
    Manager ---> UC_Login
    Employee ---> UC_Login
    
    UC_Login -. "<<includes>>" .-> UC_Pwd

    %% Admin Connections
    Admin ---> UC_ManageUsers
    Admin ---> UC_ManageEmp
    Admin ---> UC_ManageSkills
    Admin ---> UC_ManageProj
    Admin ---> UC_SysConfig

    %% Manager Connections
    Manager ---> UC_Dashboard
    Manager ---> UC_Allocate
    Manager ---> UC_EndAlloc
    Manager ---> UC_MyProj
    Manager ---> UC_TeamTS
    
    %% Manager AI Extensions
    UC_Allocate -. "<<extends>>" .-> UC_AISkill
    UC_MyProj -. "<<extends>>" .-> UC_AIRisk

    %% Employee Connections
    Employee ---> UC_SubmitTS
    Employee ---> UC_MyTS
    Employee ---> UC_MyAlloc

    %% Styling to make it look like a Use Case Diagram
    classDef actor fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000,shape:circle
    classDef usecase fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000,shape:stadium
    classDef system fill:none,stroke:#333,stroke-width:3px,stroke-dasharray: 5 5
    
    class Admin,Manager,Employee actor
    class UC_Login,UC_Pwd,UC_ManageUsers,UC_ManageEmp,UC_ManageSkills,UC_ManageProj,UC_SysConfig,UC_Dashboard,UC_Allocate,UC_EndAlloc,UC_AISkill,UC_MyProj,UC_AIRisk,UC_TeamTS,UC_SubmitTS,UC_MyTS,UC_MyAlloc usecase
    class PRM system
```

### Explanation of Use Case Relationships:

1. **`<<includes>>`**: The `Login & Authenticate` use case _includes_ `Change Password on First Login` because the system enforces this flow automatically if the `force_password_change` flag is true.
2. **`<<extends>>`**: `Find Resource via AI Skill Match` _extends_ the `Allocate Resource` use case, meaning it is an optional AI-driven path the manager can take to accomplish the goal of allocation.
3. **`<<extends>>`**: `Generate AI Risk Summary` _extends_ the `View My Projects Health` use case, as it is an optional analytical tool the manager can trigger while viewing project details.
