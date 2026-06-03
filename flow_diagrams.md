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
    MngEmp --> AddEmp[Add Employee]
    MngEmp --> ViewEmp[View All Employees]
    MngEmp --> UpdateEmp[Update Employee]
    MngEmp --> DeactEmp[Deactivate Employee]
    MngEmp --> MngSkills[Manage Employee Skills]
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
    MngUsers --> ResetPwd[Reset User Password]
    MngUsers --> DeactUser[Deactivate User]
    MngUsers -. "Back" .-> AdminMenu
    
    AdminMenu --> SysConfig[5. System Configuration]
    SysConfig --> UpdKey[Update LLM API Key]
    SysConfig --> UpdProv[Change LLM Provider]
    SysConfig --> UpdInterv[Update Scheduler Interval]
    SysConfig --> UpdHours[Update Max Weekly Hours]
    SysConfig -. "Back" .-> AdminMenu
```

---

## 3. Manager Menu Navigation

```mermaid
flowchart TD
    ManagerMenu[[Manager Menu]]
    
    ManagerMenu --> ResDash[1. Resource Dashboard]
    ResDash --> DrillEmp[Drill into employee details]
    DrillEmp -. "Back" .-> ResDash
    ResDash -. "Back" .-> ManagerMenu
    
    ManagerMenu --> AllocRes[2. Allocate Resource]
    AllocRes --> AIAlloc[Find resource using AI]
    AllocRes --> DirectAlloc[Allocate directly]
    AllocRes --> EndAlloc[End an existing allocation]
    AllocRes -. "Back" .-> ManagerMenu
    
    ManagerMenu --> MyProj[3. My Projects]
    MyProj --> ProjDetail[View Project Details]
    ProjDetail --> AIRisk[Get AI Risk Summary]
    AIRisk -. "Back" .-> ProjDetail
    ProjDetail -. "Back" .-> MyProj
    MyProj -. "Back" .-> ManagerMenu
    
    ManagerMenu --> Timesheets[4. Timesheets]
    Timesheets --> ViewEmpTS[View employee timesheet detail]
    ViewEmpTS -. "Back" .-> Timesheets
    Timesheets -. "Back" .-> ManagerMenu
    
    ManagerMenu --> AIAssist[5. AI Assistant]
    AIAssist --> SkillMatch[Skill Match]
    SkillMatch --> GoToAlloc[Go to Allocate Resource]
    AIAssist --> RiskSumm[Risk Summary]
    RiskSumm -. "Back" .-> AIAssist
    AIAssist -. "Back" .-> ManagerMenu
```

---

## 4. Employee Menu Navigation

```mermaid
flowchart TD
    EmployeeMenu[[Employee Menu]]
    
    LoginEvent((Login Event)) --> RemCheck{Timesheet Missed?}
    RemCheck -- Yes --> ShowRem[Show Reminder on Menu]
    RemCheck -- No --> EmployeeMenu
    ShowRem --> EmployeeMenu
    
    EmployeeMenu --> SubTS[1. Submit Timesheet]
    SubTS --> PickWeek[Pick Week]
    PickWeek --> LogProj[Log Hours & Tags per Project]
    LogProj --> Submit[Confirm & Submit]
    Submit -. "Back" .-> EmployeeMenu
    
    EmployeeMenu --> ViewTS[2. View My Timesheets]
    ViewTS --> WeekDetail[View Week Detail]
    WeekDetail -. "Back" .-> ViewTS
    ViewTS -. "Back" .-> EmployeeMenu
    
    EmployeeMenu --> ViewAlloc[3. View My Allocations]
    ViewAlloc -. "Back" .-> EmployeeMenu
```

---

## 5. Logical Flow: AI-Assisted Resource Allocation

```mermaid
flowchart TD
    Start([Manager initiates AI Allocation]) --> Proj[Select Project]
    Proj --> Req[Describe requirement in plain English]
    
    subgraph System Backend Process
        Req --> API[Server API Called]
        API --> FilterCap[Filter employees with free capacity]
        FilterCap --> CheckEmpty{Found Candidates?}
        CheckEmpty -- No --> ReturnEmpty[Return: No one has capacity]
        CheckEmpty -- Yes --> GatherData[Gather skills, allocations, recent tags]
        GatherData --> BuildSumm[Build structured candidate summaries]
        BuildSumm --> LLMCall[Send requirement + summaries to LLM]
        LLMCall --> LLMParse[LLM ranks & generates reasons]
    end
    
    LLMParse --> ShowUI[Console displays AI-Matched Results]
    ReturnEmpty --> ShowEmptyUI[Console: Try adjusting requirements]
    
    ShowUI --> SelectEmp[Manager selects employee]
    SelectEmp --> EnterDetails[Enter Utilisation %, Dates]
    EnterDetails --> Validate[Server Validates Allocation]
    
    Validate -- "Total > 100% or Bad Dates" --> ShowError[Show Validation Error]
    ShowError --> EnterDetails
    
    Validate -- Valid --> Confirm[Confirm Allocation]
    Confirm --> SaveDB[(Save to Database)]
    SaveDB --> End([Allocation Completed])
```

---

## 6. Logical Flow: Background Scheduler

```mermaid
flowchart TD
    Trigger((Scheduler Wakes Up)) --> Step1
    
    subgraph Step 1: Employee Utilisation
        Step1[Fetch all active allocations] --> SumUtil[Sum utilisation % per employee]
        SumUtil --> UpdTotal[Update employee total_utilisation]
        UpdTotal --> CheckZero{Utilisation == 0?}
        CheckZero -- Yes --> SetBench[Set status = BENCH]
        CheckZero -- No --> SetAlloc[Set status = ALLOCATED]
    end
    
    SetBench --> Step2
    SetAlloc --> Step2
    
    subgraph Step 2: Flag Overdue Milestones
        Step2[Fetch milestones: due_date < today AND status != DONE]
        Step2 --> MarkOverdue[Set health_flag = OVERDUE]
    end
    
    MarkOverdue --> Step3
    
    subgraph Step 3: Compute Project Health
        Step3[Fetch projects, milestones, timesheet stats]
        Step3 --> EvalRisk{Evaluate Health Rules}
        EvalRisk -- "Milestone overdue OR hours critical" --> RiskRed[Set health_status = 🔴 AT RISK]
        EvalRisk -- "Milestone approaching OR hours low" --> RiskYel[Set health_status = 🟡 ATTENTION]
        EvalRisk -- "On time & expected hours" --> RiskGrn[Set health_status = 🟢 ON TRACK]
    end
    
    RiskRed --> Sleep
    RiskYel --> Sleep
    RiskGrn --> Sleep
    
    Sleep((Sleep until next interval))
```
