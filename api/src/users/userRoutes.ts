import { createBadRequest, createConflict, createNotFound } from '../errors';
import type { Plugin, Request, ResponseToolkit, Server } from '@hapi/hapi';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { UserRole } from '../models/UserRole';
import {
  userCreatePayload,
  userUpdateRolesPayload,
  uuidParam,
} from '../schemas';
import { requireRole } from '../utils/requireRole';
import { validatePassword } from '../utils/passwordValidation';

const list = async (request: Request) => {
  await requireRole(request, 'system_admin');
  const users = await User.query()
    .select('id', 'email', 'name', 'createdAt')
    .orderBy('createdAt', 'desc');
  const withRoles = await Promise.all(
    users.map(async (u) => {
      const roles = await Role.query()
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', u.id)
        .select('roles.name');
      return { ...u, roles: roles.map((r) => r.name) };
    })
  );
  return withRoles;
};

const getById = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { id } = request.params;
  if (id !== userId) {
    await requireRole(request, 'system_admin');
  }
  const user = await User.query()
    .findById(id)
    .select('id', 'email', 'name', 'createdAt');
  if (!user) {
    throw createNotFound(request, 'errors.userNotFound');
  }
  const roles = await Role.query()
    .join('user_roles', 'roles.id', 'user_roles.role_id')
    .where('user_roles.user_id', id)
    .select('roles.name');
  return { ...user, roles: roles.map((r) => r.name) };
};

const updateRoles = async (request: Request, h: ResponseToolkit) => {
  await requireRole(request, 'system_admin');
  const { id } = request.params;
  const { roleNames } = request.payload as { roleNames: string[] };

  const user = await User.query().findById(id);
  if (!user) {
    throw createNotFound(request, 'errors.userNotFound');
  }

  const validRoles = await Role.query().whereIn('name', roleNames);
  if (validRoles.length !== roleNames.length) {
    throw createBadRequest(request, 'errors.invalidRoleName');
  }

  await UserRole.query().where({ userId: id }).delete();
  if (roleNames.length > 0) {
    await UserRole.query().insert(
      validRoles.map((r) => ({ userId: id, roleId: r.id }))
    );
  }

  const roles = await Role.query()
    .join('user_roles', 'roles.id', 'user_roles.role_id')
    .where('user_roles.user_id', id)
    .select('roles.name');
  return h.response({ id, roles: roles.map((r) => r.name) });
};

const createByAdmin = async (request: Request, h: ResponseToolkit) => {
  await requireRole(request, 'system_admin');
  const { email, password, name, roleNames } = request.payload as {
    email: string;
    password: string;
    name?: string;
    roleNames?: string[];
  };

  if (!email || !password) {
    throw createBadRequest(request, 'errors.emailAndPasswordRequired');
  }
  if (!validatePassword(password).isValid) {
    throw createBadRequest(request, 'errors.passwordRequirements');
  }

  const existing = await User.query().findOne({ email: email.toLowerCase() });
  if (existing) {
    throw createConflict(request, 'errors.emailAlreadyRegistered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.query().insert({
    email: email.toLowerCase(),
    passwordHash,
    name: name?.trim() || undefined,
  });

  const rolesToAssign = roleNames && roleNames.length > 0 ? roleNames : [];
  if (rolesToAssign.length > 0) {
    const validRoles = await Role.query().whereIn('name', rolesToAssign);
    if (validRoles.length > 0) {
      await UserRole.query().insert(
        validRoles.map((r) => ({ userId: user.id, roleId: r.id }))
      );
    }
  }

  const roles = await Role.query()
    .join('user_roles', 'roles.id', 'user_roles.role_id')
    .where('user_roles.user_id', user.id)
    .select('roles.name');
  return h
    .response({ id: user.id, email: user.email, name: user.name, roles: roles.map((r) => r.name) })
    .code(201);
};

export const userRoutes: Plugin<void> = {
  name: 'userRoutes',
  register: (server: Server) => {
    server.route([
      {
        method: 'GET',
        path: '/users',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'users'],
          description: 'List all users',
          notes: 'Requires system_admin role. Returns users with roles.',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'List of users with roles' },
                401: { description: 'Unauthorized' },
                403: { description: 'Requires system_admin role' },
              },
            },
          },
        },
        handler: list,
      },
      {
        method: 'GET',
        path: '/users/{id}',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'users'],
          description: 'Get user by ID',
          notes: 'Users can get own profile; system_admin can get any user.',
          validate: {
            params: uuidParam,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'User with roles' },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden' },
                404: { description: 'User not found' },
              },
            },
          },
        },
        handler: getById,
      },
      {
        method: 'POST',
        path: '/users',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'users'],
          description: 'Create user (admin)',
          notes: 'Requires system_admin role.',
          validate: {
            payload: userCreatePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: { description: 'User created' },
                400: { description: 'Validation error' },
                401: { description: 'Unauthorized' },
                403: { description: 'Requires system_admin role' },
                409: { description: 'Email already registered' },
              },
            },
          },
        },
        handler: createByAdmin,
      },
      {
        method: 'PATCH',
        path: '/users/{id}/roles',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'users'],
          description: 'Update user roles',
          notes: 'Requires system_admin role.',
          validate: {
            params: uuidParam,
            payload: userUpdateRolesPayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Roles updated' },
                400: { description: 'Invalid role name(s)' },
                401: { description: 'Unauthorized' },
                403: { description: 'Requires system_admin role' },
                404: { description: 'User not found' },
              },
            },
          },
        },
        handler: updateRoles,
      },
    ]);
  },
};
