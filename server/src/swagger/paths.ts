const bearerSecurity = [{ bearerAuth: [] }];
const weekQueryParam = {
  name: 'week',
  in: 'query',
  description: 'Week start date (DD-MM-YYYY). Defaults to current week.',
  schema: { type: 'string', example: '02-06-2026' },
};

export const paths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      responses: {
        200: {
          description: 'Server is running',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Authenticate user',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/AuthResponse' },
                },
              },
            },
          },
        },
        401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },
  '/auth/change-password': {
    put: {
      tags: ['Auth'],
      summary: 'Change own password',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
        },
      },
      responses: {
        200: { description: 'Password updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/admin/users': {
    post: {
      tags: ['Admin — Users'],
      summary: 'Create user',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } } },
      },
      responses: {
        201: {
          description: 'User created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    get: {
      tags: ['Admin — Users'],
      summary: 'List all users',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'User list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/admin/users/{id}/reset-password': {
    put: {
      tags: ['Admin — Users'],
      summary: 'Reset user password',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
      },
      responses: {
        200: { description: 'Password reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/users/{id}/deactivate': {
    put: {
      tags: ['Admin — Users'],
      summary: 'Deactivate user',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'User deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/users/{id}/reactivate': {
    put: {
      tags: ['Admin — Users'],
      summary: 'Reactivate user',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'User reactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },

  '/admin/employees': {
    get: {
      tags: ['Admin — Employees'],
      summary: 'List all employees',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Employee list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/admin/employees/{id}': {
    get: {
      tags: ['Admin — Employees'],
      summary: 'Get employee by ID',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Employee details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/Employee' },
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['Admin — Employees'],
      summary: 'Update employee',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' } } },
      },
      responses: {
        200: { description: 'Employee updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/employees/{id}/deactivate-preview': {
    get: {
      tags: ['Admin — Employees'],
      summary: 'Preview employee deactivation impact',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Deactivation preview',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/EmployeeDeactivatePreview' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/admin/employees/{id}/deactivate': {
    put: {
      tags: ['Admin — Employees'],
      summary: 'Deactivate employee',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Employee deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/employees/assign-manager': {
    put: {
      tags: ['Admin — Employees'],
      summary: 'Assign manager to employee',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignManagerRequest' } } },
      },
      responses: {
        200: { description: 'Manager assigned', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },

  '/admin/employees/{employeeId}/skills': {
    get: {
      tags: ['Admin — Skills'],
      summary: 'List employee skills',
      security: bearerSecurity,
      parameters: [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Skill list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Admin — Skills'],
      summary: 'Add skill to employee',
      security: bearerSecurity,
      parameters: [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AddSkillRequest' } } },
      },
      responses: {
        201: { description: 'Skill added', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/skills/{skillId}': {
    put: {
      tags: ['Admin — Skills'],
      summary: 'Update skill proficiency',
      security: bearerSecurity,
      parameters: [{ name: 'skillId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSkillRequest' } } },
      },
      responses: {
        200: { description: 'Skill updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Skills'],
      summary: 'Remove skill',
      security: bearerSecurity,
      parameters: [{ name: 'skillId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Skill removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },

  '/admin/projects': {
    post: {
      tags: ['Admin — Projects'],
      summary: 'Create project',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } },
      },
      responses: {
        201: {
          description: 'Project created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
      },
    },
    get: {
      tags: ['Admin — Projects'],
      summary: 'List all projects',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Project list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/admin/projects/{id}': {
    put: {
      tags: ['Admin — Projects'],
      summary: 'Update project',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectRequest' } } },
      },
      responses: {
        200: { description: 'Project updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/projects/{projectId}/milestones': {
    get: {
      tags: ['Admin — Milestones'],
      summary: 'List project milestones',
      security: bearerSecurity,
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Milestone list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Milestone' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Admin — Milestones'],
      summary: 'Add milestone to project',
      security: bearerSecurity,
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AddMilestoneRequest' } } },
      },
      responses: {
        201: { description: 'Milestone added', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/admin/milestones/{milestoneId}/status': {
    put: {
      tags: ['Admin — Milestones'],
      summary: 'Update milestone status',
      security: bearerSecurity,
      parameters: [{ name: 'milestoneId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMilestoneStatusRequest' } } },
      },
      responses: {
        200: { description: 'Milestone status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },

  '/admin/allocations': {
    get: {
      tags: ['Admin — Allocations'],
      summary: 'List all allocations',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Allocation list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } },
                },
              },
            },
          },
        },
      },
    },
  },

  '/admin/config': {
    get: {
      tags: ['Admin — System Config'],
      summary: 'Get system configuration',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'System config',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/SystemConfig' },
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['Admin — System Config'],
      summary: 'Update system configuration',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSystemConfigRequest' } } },
      },
      responses: {
        200: {
          description: 'Config updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/SystemConfig' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/manager/resources/dashboard': {
    get: {
      tags: ['Manager — Resources'],
      summary: 'Resource dashboard (bench / allocated)',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Dashboard data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/ResourceDashboard' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/resources/employees/{id}': {
    get: {
      tags: ['Manager — Resources'],
      summary: 'Employee detail with skills and allocations',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Employee detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/EmployeeDetail' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/manager/allocations': {
    post: {
      tags: ['Manager — Allocations'],
      summary: 'Allocate resource to project',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocateRequest' } } },
      },
      responses: {
        201: {
          description: 'Allocation created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/Allocation' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/allocations/validate': {
    post: {
      tags: ['Manager — Allocations'],
      summary: 'Validate allocation before creating',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocateRequest' } } },
      },
      responses: {
        200: {
          description: 'Validation result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/AllocationValidation' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/allocations/{id}/end': {
    put: {
      tags: ['Manager — Allocations'],
      summary: 'End an allocation',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Allocation ended', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
  },
  '/manager/projects/{projectId}/allocations': {
    get: {
      tags: ['Manager — Allocations'],
      summary: 'Active allocations for a project',
      security: bearerSecurity,
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Active allocations',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } },
                },
              },
            },
          },
        },
      },
    },
  },

  '/manager/projects': {
    get: {
      tags: ['Manager — Projects'],
      summary: 'List manager projects',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Project list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/projects/{id}/detail': {
    get: {
      tags: ['Manager — Projects'],
      summary: 'Project detail with milestones, allocations, and risk flags',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Project detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/ProjectDetail' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/manager/timesheets': {
    get: {
      tags: ['Manager — Timesheets'],
      summary: 'Team timesheets for a week',
      security: bearerSecurity,
      parameters: [weekQueryParam],
      responses: {
        200: {
          description: 'Team timesheet rows',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/TeamTimesheetRow' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/timesheets/detail': {
    get: {
      tags: ['Manager — Timesheets'],
      summary: 'Employee timesheet detail for a week',
      security: bearerSecurity,
      parameters: [
        weekQueryParam,
        { name: 'employeeId', in: 'query', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Timesheet detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/EmployeeWeekTimesheetDetail' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/manager/ai/skill-match': {
    post: {
      tags: ['Manager — AI'],
      summary: 'AI skill match for project requirement',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SkillMatchRequest' } } },
      },
      responses: {
        200: {
          description: 'Skill match results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/SkillMatchResponse' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/ai/team-build': {
    post: {
      tags: ['Manager — AI'],
      summary: 'AI complete team building from organisation-wide bench',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamBuildRequest' } } },
      },
      responses: {
        200: {
          description: 'Team build suggestions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/TeamBuildResponse' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/manager/ai/risk-summary': {
    post: {
      tags: ['Manager — AI'],
      summary: 'AI risk summary for a project',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RiskSummaryRequest' } } },
      },
      responses: {
        200: {
          description: 'Risk summary',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/RiskSummaryResponse' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/employee/timesheets': {
    post: {
      tags: ['Employee — Timesheets'],
      summary: 'Submit weekly timesheet',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitTimesheetRequest' } } },
      },
      responses: {
        201: { description: 'Timesheet submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
      },
    },
    get: {
      tags: ['Employee — Timesheets'],
      summary: 'List my timesheets',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Timesheet list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Timesheet' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/employee/timesheets/detail': {
    get: {
      tags: ['Employee — Timesheets'],
      summary: 'Timesheet detail for a week',
      security: bearerSecurity,
      parameters: [weekQueryParam],
      responses: {
        200: {
          description: 'Week timesheet detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/EmployeeWeekTimesheetDetail' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/employee/timesheets/submit-context': {
    get: {
      tags: ['Employee — Timesheets'],
      summary: 'Context for timesheet submission (allocations, max hours)',
      security: bearerSecurity,
      parameters: [weekQueryParam],
      responses: {
        200: {
          description: 'Submit context',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/SubmitTimesheetContext' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/employee/timesheets/missed-check': {
    get: {
      tags: ['Employee — Timesheets'],
      summary: 'Check for missed last-week timesheet',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Missed timesheet check',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/MissedTimesheetCheck' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/employee/allocations': {
    get: {
      tags: ['Employee — Allocations'],
      summary: 'List my active allocations',
      security: bearerSecurity,
      responses: {
        200: {
          description: 'Allocation list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } },
                },
              },
            },
          },
        },
      },
    },
  },
};
