import express, { Application } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import managerRoutes from './routes/manager.routes';
import employeeRoutes from './routes/employee.routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger/setupSwagger';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  setupSwagger(app);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/manager', managerRoutes);
  app.use('/employee', employeeRoutes);

  app.use(errorHandler);

  return app;
}
