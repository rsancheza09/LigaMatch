import type { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { PasswordResetToken, Role, TeamInvitation, TeamMember, User, UserRole } from '../models';
import {
  authForgotPasswordPayload,
  authLoginPayload,
  authRegisterByInvitePayload,
  authRegisterPayload,
  authResetPasswordPayload,
  authUpdateMePayload,
} from '../schemas';
import { sendPasswordReset } from '../services/emailService';
import { createBadRequest, createConflict, createNotFound, createUnauthorized } from '../errors';
import { generateToken } from './authPlugin';
import { validatePassword } from '../utils/passwordValidation';

const register = async (request: Request, h: ResponseToolkit) => {
  const { email, password, name } = request.payload as {
    email: string;
    password: string;
    name?: string;
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

  const token = await generateToken(user.id, user.email);
  return h.response({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' } }).code(201);
};

const registerByInvite = async (request: Request, h: ResponseToolkit) => {
  const { email, password, name, inviteToken } = request.payload as {
    email: string;
    password: string;
    name?: string;
    inviteToken: string;
  };

  const inv = await TeamInvitation.query()
    .findOne({ token: inviteToken, status: 'pending' })
    .withGraphFetched('team');
  if (!inv) throw createNotFound(request, 'errors.invitationNotFoundOrExpired');
  if (new Date(inv.expiresAt) < new Date()) {
    await TeamInvitation.query().findById(inv.id).patch({ status: 'expired' });
    throw createNotFound(request, 'errors.invitationExpired');
  }
  if (inv.email.toLowerCase() !== email.toLowerCase()) {
    throw createBadRequest(request, 'errors.emailMustMatchInvited');
  }
  if (!validatePassword(password).isValid) {
    throw createBadRequest(request, 'errors.passwordRequirements');
  }

  let user = await User.query().findOne({ email: email.toLowerCase() });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await User.query().insert({
      email: email.toLowerCase(),
      passwordHash,
      name: name?.trim() || undefined,
    });
  }

  const existingMember = await TeamMember.query().findOne({
    teamId: inv.teamId,
    userId: user.id,
  });
  if (!existingMember) {
    await TeamMember.query().insert({
      teamId: inv.teamId,
      userId: user.id,
      isAdmin: true,
    });
  } else if (!existingMember.isAdmin) {
    await TeamMember.query().findById(existingMember.id).patch({ isAdmin: true });
  }

  const teamAdminRole = await Role.query().findOne({ name: 'team_admin' });
  if (teamAdminRole) {
    const hasRole = await UserRole.query().findOne({
      userId: user.id,
      roleId: teamAdminRole.id,
    });
    if (!hasRole) {
      await UserRole.query().insert({
        userId: user.id,
        roleId: teamAdminRole.id,
      });
    }
  }

  await TeamInvitation.query().findById(inv.id).patch({ status: 'accepted' });

  const token = await generateToken(user.id, user.email);
  return h.response({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' },
    teamId: inv.teamId,
  }).code(201);
};

const login = async (request: Request, h: ResponseToolkit) => {
  const { email, password } = request.payload as { email: string; password: string };

  if (!email || !password) {
    throw createBadRequest(request, 'errors.emailAndPasswordRequired');
  }

  const user = await User.query().findOne({ email: email.toLowerCase() });
  if (!user) {
    throw createUnauthorized(request, 'errors.invalidCredentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw createUnauthorized(request, 'errors.invalidCredentials');
  }

  const adminTeam = await TeamMember.query()
    .where({ userId: user.id, isAdmin: true })
    .orderBy('createdAt', 'asc')
    .first();

  const token = await generateToken(user.id, user.email);
  const response: { token: string; user: Record<string, unknown>; teamId?: string } = {
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' },
  };
  if (adminTeam) {
    response.teamId = adminTeam.teamId;
  }
  return h.response(response);
};

const me = async (request: Request) => {
  const { userId } = request.auth.credentials as { userId: string };
  const user = await User.query().findById(userId).select('id', 'email', 'name', 'plan', 'createdAt');
  if (!user) {
    throw createNotFound(request, 'errors.userNotFound');
  }
  const adminTeam = await TeamMember.query()
    .where({ userId, isAdmin: true })
    .orderBy('createdAt', 'asc')
    .first();
  return {
    ...user,
    plan: user.plan || 'free',
    teamId: adminTeam?.teamId,
  };
};

const updateMe = async (request: Request, h: ResponseToolkit) => {
  const { userId } = request.auth.credentials as { userId: string };
  const { name } = request.payload as { name?: string | null };
  const user = await User.query().findById(userId);
  if (!user) {
    throw createNotFound(request, 'errors.userNotFound');
  }
  const updates: { name?: string } = {};
  if (name !== undefined) {
    updates.name = name?.trim() || undefined;
  }
  if (Object.keys(updates).length > 0) {
    await User.query().findById(userId).patch(updates);
  }
  const updated = await User.query().findById(userId).select('id', 'email', 'name', 'plan', 'createdAt');
  const adminTeam = await TeamMember.query()
    .where({ userId, isAdmin: true })
    .orderBy('createdAt', 'asc')
    .first();
  return h.response({
    ...updated,
    plan: updated?.plan || 'free',
    teamId: adminTeam?.teamId,
  });
};

const RESET_TOKEN_EXPIRY_HOURS = 1;

const forgotPassword = async (request: Request, h: ResponseToolkit) => {
  const { email } = request.payload as { email: string };
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.query().findOne({ email: normalizedEmail });
  if (!user) {
    return h.response({ message: 'If an account exists for this email, you will receive a password reset link.' }).code(200);
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  await PasswordResetToken.query().insert({
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
  });
  const appUrl = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordReset({ to: user.email, resetUrl, expiresAt: expiresAt.toISOString() });
  return h.response({ message: 'If an account exists for this email, you will receive a password reset link.' }).code(200);
};

const resetPassword = async (request: Request, h: ResponseToolkit) => {
  const { token, newPassword } = request.payload as { token: string; newPassword: string };
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    throw createBadRequest(request, 'errors.passwordRequirements');
  }
  const row = await PasswordResetToken.query().findOne({ token: token.trim() });
  if (!row) {
    throw createBadRequest(request, 'errors.invalidOrExpiredResetLink');
  }
  if (row.usedAt) {
    throw createBadRequest(request, 'errors.resetLinkAlreadyUsed');
  }
  if (new Date(row.expiresAt) < new Date()) {
    throw createBadRequest(request, 'errors.resetLinkExpired');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.query().findById(row.userId).patch({ passwordHash });
  await PasswordResetToken.query().findById(row.id).patch({ usedAt: new Date().toISOString() });
  return h.response({ message: 'Password has been reset. You can now sign in.' }).code(200);
};

export const authRoutes: Plugin<void> = {
  name: 'authRoutes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/auth/register',
        options: {
          auth: false,
          tags: ['api', 'auth'],
          description: 'Register a new user',
          notes: 'Creates account and returns JWT token',
          validate: {
            payload: authRegisterPayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: { description: 'User created' },
                400: { description: 'Validation error' },
                409: { description: 'Email already registered' },
              },
            },
          },
        },
        handler: register,
      },
      {
        method: 'POST',
        path: '/auth/register-by-invite',
        options: {
          auth: false,
          tags: ['api', 'auth'],
          description: 'Register via team invitation',
          notes: 'Creates account, links to team as owner, assigns team_admin role',
          validate: {
            payload: authRegisterByInvitePayload,
          },
        },
        handler: registerByInvite,
      },
      {
        method: 'POST',
        path: '/auth/login',
        options: {
          auth: false,
          tags: ['api', 'auth'],
          description: 'Login',
          notes: 'Returns JWT token for authenticated requests',
          validate: {
            payload: authLoginPayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Login successful' },
                400: { description: 'Validation error' },
                401: { description: 'Invalid credentials' },
              },
            },
          },
        },
        handler: login,
      },
      {
        method: 'GET',
        path: '/auth/me',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'auth'],
          description: 'Get current user',
          notes: 'Returns authenticated user profile. Requires Bearer token.',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'User profile' },
                401: { description: 'Unauthorized' },
                404: { description: 'User not found' },
              },
            },
          },
        },
        handler: me,
      },
      {
        method: 'PATCH',
        path: '/auth/me',
        options: {
          auth: { mode: 'required' },
          tags: ['api', 'auth'],
          description: 'Update current user profile',
          notes: 'Updates display name. Returns updated user.',
          validate: {
            payload: authUpdateMePayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Updated user profile' },
                400: { description: 'Validation error' },
                401: { description: 'Unauthorized' },
                404: { description: 'User not found' },
              },
            },
          },
        },
        handler: updateMe,
      },
      {
        method: 'POST',
        path: '/auth/forgot-password',
        options: {
          auth: false,
          tags: ['api', 'auth'],
          description: 'Request password reset',
          notes: 'Sends an email with a reset link if the account exists. Always returns 200 to avoid email enumeration.',
          validate: {
            payload: authForgotPasswordPayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'If the email is registered, a reset link was sent' },
                400: { description: 'Validation error' },
              },
            },
          },
        },
        handler: forgotPassword,
      },
      {
        method: 'POST',
        path: '/auth/reset-password',
        options: {
          auth: false,
          tags: ['api', 'auth'],
          description: 'Reset password with token',
          notes: 'Sets new password using the token from the email link. Token is single-use and expires after 1 hour.',
          validate: {
            payload: authResetPasswordPayload,
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: { description: 'Password reset successful' },
                400: { description: 'Invalid or expired token, or invalid password' },
              },
            },
          },
        },
        handler: resetPassword,
      },
    ]);
  },
};
