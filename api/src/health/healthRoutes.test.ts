import Hapi from '@hapi/hapi';
import { healthRoutes } from './healthRoutes';

describe('healthRoutes', () => {
  it('returns OK status', async () => {
    const server = Hapi.server();
    await server.register(healthRoutes);

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.result).toEqual({ status: 'OK' });
  });
});
