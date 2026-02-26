import { internal } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import { createForbidden } from '../errors';
import { Role } from '../models/Role';
import { UserRole } from '../models/UserRole';

export async function requireRole(request: Request, roleName: string): Promise<void> {
  const { userId } = request.auth.credentials as { userId: string };
  const role = await Role.query().findOne({ name: roleName });
  if (!role) {
    throw internal(`Role ${roleName} not found`);
  }
  const userRole = await UserRole.query().findOne({ userId, roleId: role.id });
  if (!userRole) {
    throw createForbidden(request, 'errors.requiresRole', { roleName });
  }
}
