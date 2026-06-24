# PRM Tool — Flow Diagrams

These flowcharts illustrate the user navigation through the application screens as well as the logical steps of key system processes.

## 1. Overall Application Navigation & Authentication

```mermaid
flowchart TD
    Start([Application Start]) --> Login[Login Screen]
    Login --> Auth{Authenticate Credentials}

    Auth -- Invalid --> Login
    Auth -- Valid --> FirstLogin{Is First Login?}

    FirstLogin -- Yes --> ChangePwd[Change Password Screen]
    ChangePwd --> ValidatePwd{Validate Password}
    ValidatePwd -- Invalid --> ChangePwd
    ValidatePwd -- Valid --> RoleCheck

    FirstLogin -- No --> RoleCheck{Check User Role}

    RoleCheck -- Admin --> AdminMenu[Admin Menu]
    RoleCheck -- Manager --> ManagerMenu[Manager Menu]
    RoleCheck -- Employee --> EmployeeMenu[Employee Menu]

    AdminMenu --> Logout[Logout]
    ManagerMenu --> Logout
    EmployeeMenu --> Logout

    Logout --> Start
```

---

## 2. Admin Menu Navigation

```mermaid
flowchart TD
    AdminMenu[[Admin Menu]]

    AdminMenu --> MngEmp[1. Manage Employees]
    MngEmp --> ViewEmp[View All Employees]
    MngEmp --> UpdateEmp[Update Employee]
    MngEmp --> DeactEmp[Deactivate Employee]
    MngEmp --> DeactPreview[Deactivate Preview — active allocations]
    DeactEmp --> DeactPreview
    MngEmp --> MngSkills[Manage Employee Skills]
    MngEmp --> AssignMgr[Assign Manager to Employee]
    MngEmp -. "Back" .-> AdminMenu

    AdminMenu --> MngProj[2. Manage Projects]
    MngProj --> CreateProj[Create Project]
    MngProj --> ViewProj[View All Projects]
    MngProj --> UpdateProj[Update Project Details]
    MngProj --> MngMiles[Manage Milestones]
    MngProj -. "Back" .-> AdminMenu

    AdminMenu --> ViewAlloc[3. View All Allocations]
    ViewAlloc -. "Back" .-> AdminMenu

    AdminMenu --> MngUsers[4. Manage Users]
    MngUsers --> CreateUser[Create User Account]
    MngUsers --> ViewUsers[View All Users]
    ViewUsers --> Reactivate[Reactivate Inactive User]
    MngUsers --> ResetPwd[Reset User Password]
    MngUsers --> DeactUser[Deactivate User]
    MngUsers -. "Back" .-> AdminMenu

    AdminMenu --> SysConfig[5. System Configuration]
    SysConfig --> UpdHost[Update LLM Host]
    SysConfig --> UpdModel[Update LLM Model]
    SysConfig --> UpdKey[Update LLM API Key]
    SysConfig --> UpdInterv[Update Scheduler Interval]
    SysConfig --> UpdHours[Update Max Weekly Hours]
    SysConfig -. "Back" .-> AdminMenu
```

> **Note:** "Add Employee" is not a separate menu option — employees are created via Manage Users → Create User Account, then assigned a manager under Manage Employees.

---

## 3. Manager Menu Navigation

> **Scoping Rule:** Dashboard, direct allocation, timesheets, and restore-access use the manager's team (`RESOURCE.manager_id`). AI Skill Match searches **all active employees** organisation-wide (manager must own the selected project). AI Team Build searches organisation-wide **bench** employees only.

```mermaid
flowchart TD
    ManagerMenu[[Manager Menu]]

    ManagerMenu --> ResDash[1. Resource Dashboard]
    ResDash --> DrillEmp[Drill into employee details]
    DrillEmp -. "Back" .-> ResDash
    ResDash -. "Back" .-> ManagerMenu

    ManagerMenu --> AllocRes[2. Allocate Resource]
    AllocRes --> DirectAlloc[Allocate directly]
    DirectAlloc --> ValidateUtil[Validate utilisation via API]
    AllocRes --> EndAlloc[End an existing allocation]
    AllocRes -. "Back" .-> ManagerMenu

    ManagerMenu --> MyProj[3. My Projects]
    MyProj --> ProjDetail[View Project Details]
    ProjDetail --> RiskFlags[View Risk Flags]
    ProjDetail --> AIRisk[Get AI Risk Summary]
    AIRisk -. "Back" .-> ProjDetail
    ProjDetail -. "Back" .-> MyProj
    MyProj -. "Back" .-> ManagerMenu

    ManagerMenu --> Timesheets[4. Timesheets]
    Timesheets --> ViewEmpTS[View employee timesheet detail]
    ViewEmpTS -. "Back" .-> Timesheets
    Timesheets -. "Back" .-> ManagerMenu

    ManagerMenu --> RestoreTS[5. Restore Timesheet Access]
    RestoreTS --> PickFrozen[Select frozen team member]
    PickFrozen --> Unfreeze[Restore submission access]
    RestoreTS -. "Back" .-> ManagerMenu

    ManagerMenu --> AIAssist[6. AI Assistant]
    AIAssist --> SkillMatch[Skill Match — view suggestions only]
    SkillMatch -. "Back" .-> AIAssist
    AIAssist --> TeamBuild[Complete Team Building]
    TeamBuild -. "Back" .-> AIAssist
    AIAssist --> RiskSumm[Risk Summary]
    RiskSumm -. "Back" .-> AIAssist
    AIAssist -. "Back" .-> ManagerMenu
```

---

## 4. Employee Menu Navigation

```mermaid
flowchart TD
    EmployeeMenu[[Employee Menu]]

    LoginEvent((Login Event)) --> MissedCheck{GET /timesheets/missed-check}
    MissedCheck -- Frozen --> ShowFrozen[Show freeze warning on menu]
    MissedCheck -- Missed --> ShowRem[Show missed-week reminder]
    MissedCheck -- OK --> EmployeeMenu
    ShowFrozen --> EmployeeMenu
    ShowRem --> EmployeeMenu

    EmployeeMenu --> SubTS[1. Submit Timesheet]
    SubTS --> PickWeek[Pick Week]
    PickWeek --> LoadCtx[Load submit context — allocations & max hours]
    LoadCtx --> LogProj[Log Hours & Tags per Project]
    LogProj --> Summary[Review Summary]
    Summary --> Submit[Confirm & Submit]
    Submit -. "Back" .-> EmployeeMenu

    EmployeeMenu --> ViewTS[2. View My Timesheets]
    ViewTS --> WeekDetail[View Week Detail]
    WeekDetail -. "Back" .-> ViewTS
    ViewTS -. "Back" .-> EmployeeMenu

    EmployeeMenu --> ViewAlloc[3. View My Allocations]
    ViewAlloc -. "Back" .-> EmployeeMenu
```

> **Compliance:** If submission access is frozen (`timesheet_access_frozen`), Submit Timesheet is blocked server-side until the manager restores access.

---

## 5. Logical Flow: AI Skill Match

Entry point: **Manager Menu → AI Assistant → Skill Match**. Results are suggestions only; the manager allocates separately via **Allocate Resource** if they choose to proceed.

```mermaid
flowchart TD
    Start([AI Assistant → Skill Match]) --> Proj[Enter Project ID]
    Proj --> Req[Describe requirement in plain English]
    Req --> API[POST /manager/ai/skill-match]

    subgraph System Backend Process
        API --> OwnProj[Assert manager owns project]
        OwnProj --> LoadAll[Load all active employees — org-wide]
        LoadAll --> GatherData[Gather skills, utilisation, recent activity tags]
        GatherData --> BuildSumm[Build structured candidate summaries]
        BuildSumm --> ParseHrs{Requirement mentions weekly hours?}
        ParseHrs -- Yes --> FilterPart[Keep employees with enough free hours/week]
        ParseHrs -- No --> FilterFull[Keep employees with any free capacity]
        FilterPart --> CheckEmpty{Found candidates?}
        FilterFull --> CheckEmpty
        CheckEmpty -- No --> ThrowErr[400: No employees have enough capacity]
        CheckEmpty -- Yes --> LLMCall[Call GemmaAIService via AIServiceFactory]
        LLMCall --> LLMParse[LLM ranks & generates reasons]
        LLMParse --> FilterValid[Drop LLM results not in candidate set]
        FilterValid --> Enrich[Enrich with employeeId, availability, suggested %]
    end

    Enrich --> ShowUI[Console displays ranked suggestions + disclaimer]
    ThrowErr --> ShowErr[Console shows error message]
    ShowUI --> End([Return to AI Assistant menu])
    ShowErr --> End
```

---

## 6. Logical Flow: AI Team Build

Entry point: **Manager Menu → AI Assistant → Complete Team Building**. No project selection — searches organisation-wide bench only.

```mermaid
flowchart TD
    Start([AI Assistant → Team Build]) --> Req[Describe all roles in one prompt]
    Req --> API[POST /manager/ai/team-build]

    subgraph System Backend Process
        API --> LoadBench[Load active BENCH employees — org-wide]
        LoadBench --> BuildBench[Build bench candidate profiles with skills]
        BuildBench --> TryAI[Call GemmaAIService.generateTeamBuild]
        TryAI --> AIOk{AI returned assignments?}
        AIOk -- No / timeout --> RuleBased[Fallback: rule-based role matching]
        AIOk -- Yes --> AssignRoles[Map roles to bench employees]
        RuleBased --> AssignRoles
        AssignRoles --> Dedupe[Reject duplicate person across roles]
        Dedupe --> GapAnalysis[Analyse unfilled roles — skill / availability / bench gaps]
    end

    GapAnalysis --> ShowUI[Console: Filled roles table + unfilled role details]
    ShowUI --> End([Return to AI Assistant menu — verify before allocating])
```

---

## 7. Logical Flow: AI Risk Summary

Entry points: **My Projects → Project Details → [A] AI Risk Summary**, or **AI Assistant → Risk Summary**.

```mermaid
flowchart TD
    Start([Select project for risk analysis]) --> API[POST /manager/ai/risk-summary]

    subgraph System Backend Process
        API --> OwnProj[Assert manager owns project]
        OwnProj --> GatherFacts[Collect milestones, allocations, recent hours vs expected]
        GatherFacts --> TryLLM[Call GemmaAIService.generateRiskSummary]
        TryLLM --> LLMOk{AI call succeeded?}
        LLMOk -- Yes --> Summary[Markdown risk summary from LLM]
        LLMOk -- No --> Fallback[Rule-based fallback summary table]
    end

    Summary --> ShowUI[Console displays summary + AI-generated disclaimer]
    Fallback --> ShowUI
    ShowUI --> End([Return to previous screen])
```

---

## 8. Logical Flow: Background Scheduler

```mermaid
flowchart TD
    Trigger((Scheduler Wakes Up)) --> Step1

    subgraph Step 1: Resource Utilisation
        Step1[Fetch all active allocations] --> SumUtil[Sum utilisation % per resource]
        SumUtil --> UpdTotal[Update resource total_utilisation]
        UpdTotal --> CheckZero{Utilisation == 0?}
        CheckZero -- Yes --> SetBench[Set status = BENCH]
        CheckZero -- No --> SetAlloc[Set status = ALLOCATED]
    end

    SetBench --> Step2
    SetAlloc --> Step2

    subgraph Step 2: Flag Missed Timesheets
        Step2[For past allocated weeks without submission]
        Step2 --> InsertMissed[INSERT timesheet status = MISSED]
    end

    InsertMissed --> Step3

    subgraph Step 3: Email Reminders & Freeze
        Step3[Check employees past submission deadline]
        Step3 --> SendRem1[Send reminder 1 email]
        SendRem1 --> SendRem2[Send reminder 2 email]
        SendRem2 --> Freeze[Set timesheet_access_frozen = TRUE]
    end

    Freeze --> Step4

    subgraph Step 4: Flag Overdue Milestones
        Step4[Fetch milestones: due_date < today AND status != DONE]
        Step4 --> MarkOverdue[Set health_flag = OVERDUE]
    end

    MarkOverdue --> Step5

    subgraph Step 5: Compute Project Health
        Step5[Fetch projects, milestones, timesheet stats]
        Step5 --> EvalRisk{Evaluate Health Rules}
        EvalRisk -- "Overdue / hours or SP critical" --> RiskRed[Set health_status = AT_RISK]
        EvalRisk -- "Approaching / hours or SP low" --> RiskYel[Set health_status = ATTENTION]
        EvalRisk -- "On track" --> RiskGrn[Set health_status = ON_TRACK]
        RiskRed --> NotifyMgr[Email manager if first AT_RISK]
    end

    NotifyMgr --> Sleep
    RiskYel --> Sleep
    RiskGrn --> Sleep

    Sleep((Sleep until next interval))
```

### Changes from prior diagrams → current implementation:
- **Admin:** Deactivate preview step; reactivate user from View All Users; system config uses LLM host/model instead of provider swap.
- **Manager:** AI lives under AI Assistant (not Allocate Resource); Skill Match is org-wide and read-only; Team Build and Risk Summary have dedicated flows; direct allocation validates via API.
- **Employee:** Login checks missed status and freeze state; submit flow loads context from API first.
- **AI:** Skill Match filters by parsed weekly hours or free capacity before LLM; Team Build falls back to rule-based matching; Risk Summary falls back when LLM is unavailable.
- **Scheduler:** Six logical steps including missed flagging, email reminders, access freeze, and AT_RISK manager notifications.
