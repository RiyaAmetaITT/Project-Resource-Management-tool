import { paths } from './paths';
import { schemas } from './schemas';

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PRM Tool API',
    version: '1.0.0',
    description:
      'Project & Resource Management Tool — REST API documentation. ' +
      'Authenticate via POST /auth/login, then use the returned JWT as a Bearer token.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development (default port)' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Admin — Users' },
    { name: 'Admin — Employees' },
    { name: 'Admin — Skills' },
    { name: 'Admin — Projects' },
    { name: 'Admin — Milestones' },
    { name: 'Admin — Allocations' },
    { name: 'Admin — System Config' },
    { name: 'Manager — Resources' },
    { name: 'Manager — Allocations' },
    { name: 'Manager — Projects' },
    { name: 'Manager — Timesheets' },
    { name: 'Manager — AI' },
    { name: 'Employee — Timesheets' },
    { name: 'Employee — Allocations' },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT obtained from POST /auth/login',
      },
    },
    schemas,
  },
};
