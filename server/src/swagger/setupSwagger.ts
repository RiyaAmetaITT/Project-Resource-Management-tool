import { Application } from 'express';
import { serve, setup } from 'swagger-ui-express';

import { openapiSpec } from './openapi';

export function setupSwagger(app: Application): void {
  const port = process.env.PORT ?? 3000;
  const spec = {
    ...openapiSpec,
    servers: [{ url: `http://localhost:${port}`, description: 'Local development' }],
  };

  app.use('/api-docs', serve, setup(spec, {
    customSiteTitle: 'PRM Tool API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  }));
}
