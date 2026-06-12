export const schemas = {
  Role: {
    type: 'string',
    enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  ResourceStatus: {
    type: 'string',
    enum: ['BENCH', 'ALLOCATED'],
  },
  ProjectStatus: {
    type: 'string',
    enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'],
  },
  HealthStatus: {
    type: 'string',
    enum: ['ON_TRACK', 'ATTENTION', 'AT_RISK'],
  },
  MilestoneStatus: {
    type: 'string',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
  },
  HealthFlag: {
    type: 'string',
    enum: ['NORMAL', 'OVERDUE'],
  },
  Proficiency: {
    type: 'string',
    enum: ['Beginner', 'Intermediate', 'Advanced'],
  },
  SkillCategory: {
    type: 'string',
    enum: ['Backend', 'Frontend', 'DevOps', 'QA', 'Other'],
  },
  LlmProvider: {
    type: 'string',
    enum: ['gemma'],
  },
  TimesheetStatus: {
    type: 'string',
    enum: ['SUBMITTED', 'MISSED'],
  },
  RiskFlagType: {
    type: 'string',
    enum: ['OVERDUE_MILESTONE', 'LOW_HOURS', 'ALLOCATION_OK'],
  },
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string' },
    },
    required: ['success'],
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
    },
    required: ['success', 'message'],
  },
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'admin' },
      password: { type: 'string', format: 'password' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['newPassword', 'confirmPassword'],
    properties: {
      newPassword: { type: 'string', format: 'password' },
      confirmPassword: { type: 'string', format: 'password' },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      role: { $ref: '#/components/schemas/Role' },
      userId: { type: 'integer' },
      fullName: { type: 'string' },
      forcePasswordChange: { type: 'boolean' },
    },
  },
  CreateUserRequest: {
    type: 'object',
    required: ['fullName', 'email', 'username', 'temporaryPassword', 'role'],
    properties: {
      fullName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      temporaryPassword: { type: 'string', format: 'password' },
      role: { $ref: '#/components/schemas/Role' },
    },
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['newPassword'],
    properties: {
      newPassword: { type: 'string', format: 'password' },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      email: { type: 'string' },
      fullName: { type: 'string' },
      role: { $ref: '#/components/schemas/Role' },
      isActive: { type: 'boolean' },
    },
  },
  UpdateEmployeeRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      department: { type: 'string' },
      designation: { type: 'string' },
    },
  },
  AssignManagerRequest: {
    type: 'object',
    required: ['employeeUserId', 'managerId'],
    properties: {
      employeeUserId: { type: 'integer' },
      managerId: { type: 'integer' },
    },
  },
  Employee: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      managerId: { type: 'integer', nullable: true },
      name: { type: 'string' },
      email: { type: 'string' },
      department: { type: 'string' },
      designation: { type: 'string' },
      status: { $ref: '#/components/schemas/ResourceStatus' },
      totalUtilisation: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
  EmployeeDeactivatePreview: {
    type: 'object',
    properties: {
      employee: { $ref: '#/components/schemas/Employee' },
      activeAllocations: {
        type: 'array',
        items: { $ref: '#/components/schemas/Allocation' },
      },
    },
  },
  AddSkillRequest: {
    type: 'object',
    required: ['skillName', 'category', 'proficiencyLevel'],
    properties: {
      skillName: { type: 'string' },
      category: { $ref: '#/components/schemas/SkillCategory' },
      proficiencyLevel: { $ref: '#/components/schemas/Proficiency' },
    },
  },
  UpdateSkillRequest: {
    type: 'object',
    required: ['proficiencyLevel'],
    properties: {
      proficiencyLevel: { $ref: '#/components/schemas/Proficiency' },
    },
  },
  Skill: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      employeeId: { type: 'integer' },
      skillName: { type: 'string' },
      category: { $ref: '#/components/schemas/SkillCategory' },
      proficiencyLevel: { $ref: '#/components/schemas/Proficiency' },
    },
  },
  CreateProjectRequest: {
    type: 'object',
    required: ['name', 'description', 'startDate', 'endDate', 'status', 'managerId'],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      startDate: { type: 'string', description: 'DD-MM-YYYY', example: '01-06-2026' },
      endDate: { type: 'string', description: 'DD-MM-YYYY', example: '31-12-2026' },
      totalStoryPoints: { type: 'integer' },
      status: { $ref: '#/components/schemas/ProjectStatus' },
      managerId: { type: 'integer' },
    },
  },
  UpdateProjectRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      startDate: { type: 'string', description: 'DD-MM-YYYY' },
      endDate: { type: 'string', description: 'DD-MM-YYYY' },
      totalStoryPoints: { type: 'integer' },
      status: { $ref: '#/components/schemas/ProjectStatus' },
      managerId: { type: 'integer' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      description: { type: 'string' },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      totalStoryPoints: { type: 'integer' },
      completedStoryPoints: { type: 'integer' },
      status: { $ref: '#/components/schemas/ProjectStatus' },
      healthStatus: { $ref: '#/components/schemas/HealthStatus' },
      managerId: { type: 'integer' },
      managerName: { type: 'string' },
    },
  },
  AddMilestoneRequest: {
    type: 'object',
    required: ['title', 'dueDate'],
    properties: {
      title: { type: 'string' },
      dueDate: { type: 'string', description: 'DD-MM-YYYY' },
      storyPoints: { type: 'integer' },
    },
  },
  UpdateMilestoneStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { $ref: '#/components/schemas/MilestoneStatus' },
    },
  },
  Milestone: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      projectId: { type: 'integer' },
      title: { type: 'string' },
      dueDate: { type: 'string', format: 'date-time' },
      storyPoints: { type: 'integer' },
      status: { $ref: '#/components/schemas/MilestoneStatus' },
      healthFlag: { $ref: '#/components/schemas/HealthFlag' },
    },
  },
  Allocation: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      employeeId: { type: 'integer' },
      employeeName: { type: 'string' },
      projectId: { type: 'integer' },
      projectName: { type: 'string' },
      utilisationPercent: { type: 'number' },
      fromDate: { type: 'string', format: 'date-time' },
      toDate: { type: 'string', format: 'date-time' },
    },
  },
  AllocateRequest: {
    type: 'object',
    required: ['employeeId', 'projectId', 'utilisationPercent', 'fromDate', 'toDate'],
    properties: {
      employeeId: { type: 'integer' },
      projectId: { type: 'integer' },
      utilisationPercent: { type: 'number', minimum: 0, maximum: 100 },
      fromDate: { type: 'string', description: 'DD-MM-YYYY' },
      toDate: { type: 'string', description: 'DD-MM-YYYY' },
    },
  },
  AllocationValidation: {
    type: 'object',
    properties: {
      employeeName: { type: 'string' },
      currentTotal: { type: 'number' },
      newTotal: { type: 'number' },
      isValid: { type: 'boolean' },
    },
  },
  SystemConfig: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      llmProvider: { $ref: '#/components/schemas/LlmProvider' },
      llmHost: { type: 'string', example: 'https://api.groq.com/openai/v1' },
      llmModel: { type: 'string', example: 'gemma3:12b-it-q8_0' },
      llmApiKey: { type: 'string', description: 'Masked in responses (****)' },
      schedulerIntervalHrs: { type: 'number' },
      maxWeeklyHours: { type: 'number' },
    },
  },
  UpdateSystemConfigRequest: {
    type: 'object',
    properties: {
      llmProvider: { $ref: '#/components/schemas/LlmProvider' },
      llmHost: { type: 'string' },
      llmModel: { type: 'string' },
      llmApiKey: { type: 'string' },
      schedulerIntervalHrs: { type: 'number' },
      maxWeeklyHours: { type: 'number' },
    },
  },
  TimesheetEntry: {
    type: 'object',
    required: ['projectId', 'hours', 'activityTags'],
    properties: {
      projectId: { type: 'integer' },
      hours: { type: 'number' },
      activityTags: { type: 'array', items: { type: 'string' } },
    },
  },
  SubmitTimesheetRequest: {
    type: 'object',
    required: ['weekStartDate', 'entries'],
    properties: {
      weekStartDate: { type: 'string', description: 'DD-MM-YYYY' },
      entries: {
        type: 'array',
        items: { $ref: '#/components/schemas/TimesheetEntry' },
      },
    },
  },
  Timesheet: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      employeeId: { type: 'integer' },
      employeeName: { type: 'string' },
      weekStartDate: { type: 'string', format: 'date-time' },
      totalHours: { type: 'number' },
      status: { $ref: '#/components/schemas/TimesheetStatus' },
    },
  },
  WeekAllocation: {
    type: 'object',
    properties: {
      projectId: { type: 'integer' },
      projectName: { type: 'string' },
      utilisationPercent: { type: 'number' },
      maxHours: { type: 'number' },
    },
  },
  SubmitTimesheetContext: {
    type: 'object',
    properties: {
      employeeName: { type: 'string' },
      weekStartDate: { type: 'string' },
      maxWeeklyHours: { type: 'number' },
      allocations: {
        type: 'array',
        items: { $ref: '#/components/schemas/WeekAllocation' },
      },
    },
  },
  MissedTimesheetCheck: {
    type: 'object',
    properties: {
      hasMissedLastWeek: { type: 'boolean' },
      missedWeekStartDate: { type: 'string', nullable: true },
    },
  },
  EmployeeWeekTimesheetDetail: {
    type: 'object',
    properties: {
      employeeName: { type: 'string' },
      weekStartDate: { type: 'string' },
      status: { $ref: '#/components/schemas/TimesheetStatus' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            projectId: { type: 'integer' },
            projectName: { type: 'string' },
            hours: { type: 'number' },
            activityTags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      totalHours: { type: 'number' },
    },
  },
  TeamTimesheetRow: {
    type: 'object',
    properties: {
      employeeId: { type: 'integer' },
      employeeName: { type: 'string' },
      projectId: { type: 'integer' },
      projectName: { type: 'string' },
      hours: { type: 'number' },
      status: { $ref: '#/components/schemas/TimesheetStatus' },
    },
  },
  DashboardEmployee: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      department: { type: 'string' },
      totalUtilisation: { type: 'number' },
      skills: { type: 'string' },
    },
  },
  ResourceDashboard: {
    type: 'object',
    properties: {
      bench: { type: 'array', items: { $ref: '#/components/schemas/DashboardEmployee' } },
      allocated: { type: 'array', items: { $ref: '#/components/schemas/DashboardEmployee' } },
      partialCount: { type: 'integer' },
    },
  },
  EmployeeDetail: {
    type: 'object',
    properties: {
      employee: { $ref: '#/components/schemas/Employee' },
      skills: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
      activeAllocations: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } },
      recentTags: { type: 'array', items: { type: 'string' } },
    },
  },
  RiskFlag: {
    type: 'object',
    properties: {
      type: { $ref: '#/components/schemas/RiskFlagType' },
      message: { type: 'string' },
      isPositive: { type: 'boolean' },
    },
  },
  ProjectDetail: {
    type: 'object',
    properties: {
      project: { $ref: '#/components/schemas/Project' },
      milestones: { type: 'array', items: { $ref: '#/components/schemas/Milestone' } },
      allocations: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } },
      riskFlags: { type: 'array', items: { $ref: '#/components/schemas/RiskFlag' } },
    },
  },
  SkillMatchRequest: {
    type: 'object',
    required: ['projectId', 'requirement'],
    properties: {
      projectId: { type: 'integer' },
      requirement: { type: 'string' },
    },
  },
  SkillMatchResult: {
    type: 'object',
    properties: {
      employeeId: { type: 'integer' },
      name: { type: 'string' },
      reason: { type: 'string' },
      skillsMatch: { type: 'string' },
      availability: { type: 'string' },
      recentActivity: { type: 'string' },
      suggestedUtilisationPercent: { type: 'number' },
    },
  },
  SkillMatchResponse: {
    type: 'object',
    properties: {
      projectId: { type: 'integer' },
      results: { type: 'array', items: { $ref: '#/components/schemas/SkillMatchResult' } },
    },
  },
  RiskSummaryRequest: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'integer' },
    },
  },
  RiskSummaryResponse: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
    },
  },
  TeamBuildRequest: {
    type: 'object',
    required: ['requirement'],
    properties: {
      requirement: {
        type: 'string',
        example: 'I need 1 Java developer, 1 QA, 1 SDET, and 1 DevOps engineer',
      },
    },
  },
  TeamBuildFilledRole: {
    type: 'object',
    properties: {
      roleTitle: { type: 'string' },
      requiredSkills: { type: 'array', items: { type: 'string' } },
      employeeId: { type: 'integer' },
      employeeName: { type: 'string' },
      matchedSkills: { type: 'array', items: { type: 'string' } },
      proficiencyLevels: { type: 'array', items: { type: 'string' } },
      reason: { type: 'string' },
    },
  },
  TeamBuildUnfilledRole: {
    type: 'object',
    properties: {
      roleTitle: { type: 'string' },
      requiredSkills: { type: 'array', items: { type: 'string' } },
      gapType: { type: 'string', enum: ['SKILL_GAP', 'AVAILABILITY_GAP', 'BENCH_EXHAUSTED'] },
      message: { type: 'string' },
      availableFrom: { type: 'string' },
      skilledEmployees: { type: 'array', items: { type: 'string' } },
    },
  },
  TeamBuildResponse: {
    type: 'object',
    properties: {
      requirement: { type: 'string' },
      benchSearched: { type: 'integer' },
      filled: { type: 'array', items: { $ref: '#/components/schemas/TeamBuildFilledRole' } },
      unfilled: { type: 'array', items: { $ref: '#/components/schemas/TeamBuildUnfilledRole' } },
    },
  },
};
