import Jwt from '@hapi/jwt';
import type { Plugin } from '@hapi/hapi';
import { User } from '../models/User';

const JWT_ISSUER = 'ligamatch';
const JWT_AUDIENCE = 'ligamatch';

/** Session duration: 24 hours. Token expires after this. */
const SESSION_TTL_SEC = 24 * 60 * 60;

export const authPlugin: Plugin<void> = {
  name: 'auth',
  register: async (server) => {
    await server.register(Jwt);

    const secret = process.env.JWT_SECRET || 'development-secret-change-in-production';

    server.auth.strategy('jwt', 'jwt', {
      keys: secret,
      verify: {
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        exp: true,
        sub: false,
        maxAgeSec: SESSION_TTL_SEC,
      },
      validate: async (artifacts) => {
        const userId = artifacts.decoded.payload.userId as string;
        const user = await User.query().findById(userId);
        if (!user) {
          return { isValid: false };
        }
        return {
          isValid: true,
          credentials: {
            userId: user.id,
            email: user.email,
            payload: artifacts.decoded.payload,
          },
        };
      },
    });

    server.auth.default('jwt');
  },
};

export async function generateToken(userId: string, email: string): Promise<string> {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-production';
  return Jwt.token.generate(
    {
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      userId,
      email,
    },
    {
      key: secret,
      algorithm: 'HS256',
    },
    {
      ttlSec: SESSION_TTL_SEC,
    }
  );
}
