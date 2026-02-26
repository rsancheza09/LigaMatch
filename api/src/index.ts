import '../environment';

import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import type { Plugin } from '@hapi/hapi';
import Hapi from '@hapi/hapi';
import HapiSwagger from 'hapi-swagger';
import { authPlugin } from './auth/authPlugin';
import { authRoutes } from './auth/authRoutes';
import { healthRoutes } from './health/healthRoutes';
import { swaggerOptions } from './swagger/swaggerConfig';
import { matchRoutes } from './matches/matchRoutes';
import { messageRoutes } from './messages/messageRoutes';
import { notificationRoutes } from './notifications/notificationRoutes';
import { teamRoutes } from './teams/teamRoutes';
import { tournamentRoutes } from './tournaments/tournamentRoutes';
import { userRoutes } from './users/userRoutes';

const start = async (): Promise<void> => {
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:4000', 'http://127.0.0.1:4000'];

  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    routes: {
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
    },
  });

  await server.register([Inert, Vision]);

  const plugins: Plugin<void>[] = [
    authPlugin,
    authRoutes,
    healthRoutes,
    tournamentRoutes,
    teamRoutes,
    matchRoutes,
    userRoutes,
    notificationRoutes,
    messageRoutes,
  ];
  await server.register(plugins);

  await server.register({
    plugin: HapiSwagger,
    options: swaggerOptions,
  });

  server.ext('onPreResponse', (request, h) => {
    const response = request.response;
    if (response && 'isBoom' in response && (response as { isBoom?: boolean }).isBoom) {
      const err = response as {
        output?: { statusCode: number; payload?: Record<string, unknown> };
        message?: string;
        stack?: string;
        reformat?: (debug?: boolean) => void;
      };
      if (err.output?.statusCode >= 500) {
        console.error('[500]', err.message || err.output, err.stack);
        if (process.env.ENV === 'development' && typeof err.reformat === 'function') {
          err.reformat(true);
        }
      }
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server running at ${server.info.uri}`);

  process.on('SIGINT', async () => {
    console.log('Shutting down');
    await server.stop();
    process.exit(0);
  });
};

void start();
