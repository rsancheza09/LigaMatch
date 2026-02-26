import type { RegisterOptions } from 'hapi-swagger';

export const swaggerOptions: RegisterOptions = {
  info: {
    title: 'LigaMatch API',
    version: '1.0.0',
    description: 'API for creating and managing sports tournaments',
  },
  basePath: '/',
  documentationPath: '/documentation',
  swaggerUIPath: '/documentation/',
  securityDefinitions: {
    Bearer: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      'x-keyPrefix': 'Bearer ',
    },
  },
  deReference: false,
};
