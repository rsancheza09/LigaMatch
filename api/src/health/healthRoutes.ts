import type { Plugin, Server } from '@hapi/hapi';

const registerRoutes = (server: Server): void => {
  server.route({
    method: 'GET',
    path: '/health',
    options: {
      auth: false,
      tags: ['api', 'health'],
      description: 'Health check endpoint',
      notes: 'Returns API status',
      plugins: {
        'hapi-swagger': {
          responses: {
            200: { description: 'API is healthy' },
          },
        },
      },
    },
    handler: () => ({ status: 'OK' }),
  });
};

export const healthRoutes: Plugin<void> = {
  name: 'healthRoutes',
  register: registerRoutes,
};
